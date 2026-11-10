import { inject, InjectionToken, Service, signal, Signal } from '@angular/core';
import { applyJsonPatch } from '@core/apply-json-patch';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { ArkErrors, type } from 'arktype';
import { from, map, Observable, Subject, throwError } from 'rxjs';
import { GameState, gameState, memberState, MemberStateEvent, StateChange, stateChange, StateDelta, touchesGame } from './game-state.model';

export type ExitReason = 'NotAMember';
export type DisconnectedReason = 'initial' | 'server_rejected' | 'network_error';
export type GameConnectionState = { status: 'disconnected'; reason: DisconnectedReason } | { status: 'connecting' } | { status: 'connected' };
export type GameHubConnectionFactory = (url: string) => HubConnection;

const exitReason = type("'NotAMember'");
const pingTimestamp = type('string.date.parse');
const committedVersion = type('number.integer >= 0 | null');
export const GAME_HUB_CONNECTION_FACTORY = new InjectionToken<GameHubConnectionFactory>('Game hub connection factory', {
  factory: () => url => new HubConnectionBuilder().withUrl(url).withAutomaticReconnect().build(),
});

@Service()
export class GameConnectionService {
  private readonly connectionFactory = inject(GAME_HUB_CONNECTION_FACTORY);
  private readonly _state = signal<GameConnectionState>({ status: 'disconnected', reason: 'initial' });
  public readonly state: Signal<GameConnectionState> = this._state.asReadonly();
  private readonly events = new Subject<MemberStateEvent>();
  public readonly memberStateEvents: Observable<MemberStateEvent> = this.events.asObservable();
  private connection: HubConnection | undefined;
  private gameId: string | undefined;
  private confirmed: GameState | null = null;
  private syncing = false;
  private needsSync = false;
  private requestId = 0;
  private buffer: StateChange[] = [];
  private readonly retired = new Set<string>();
  private validateGame: (game: unknown) => unknown = game => game;
  private observedGeneration: string | null = null;
  private observation = 0;

  public connect(gameId: string, validateGame: (game: unknown) => unknown = game => game): void {
    if (this.gameId === gameId) return;
    this.close('initial');
    this.validateGame = validateGame;
    const connection = this.connectionFactory(`/api/game?gameId=${gameId}`);
    this.connection = connection;
    this.gameId = gameId;
    connection.onreconnecting(() => {
      if (this.connection !== connection) return;
      this.requestId++;
      this.syncing = true;
      this._state.set({ status: 'connecting' });
    });
    connection.onreconnected(() => {
      if (this.connection !== connection) return;
      this.syncing = false;
      this._state.set({ status: 'connected' });
      this.resync(connection, 'reconnect');
    });
    connection.onclose(error => {
      if (this.connection === connection && error) this.close('network_error');
    });
    connection.on('Exit', (reason: unknown) => {
      if (this.connection !== connection) return;
      exitReason.assert(reason);
      this.close('server_rejected');
    });
    connection.on('StateChanged', (payload: unknown) => {
      if (this.connection !== connection) return;
      this.handleChange(connection, stateChange.assert(payload));
    });
    this._state.set({ status: 'connecting' });
    connection.start().then(
      () => {
        if (this.connection !== connection) return;
        this._state.set({ status: 'connected' });
        this.resync(connection, 'initial');
      },
      () => {
        if (this.connection === connection) this.close('network_error');
      },
    );
  }

  public disconnect(): void {
    this.close('initial');
  }

  public synchronize(): void {
    if (this.connection) this.resync(this.connection, 'version_gap');
  }

  public ping(): Observable<Date> {
    const connection = this.connection;
    if (!connection) return throwError(() => new Error('Cannot ping without an active connection.'));
    return from(connection.invoke<unknown>('Ping')).pipe(map(timestamp => pingTimestamp.assert(timestamp)));
  }

  public execute(action: string): Observable<number | null> {
    const connection = this.connection;
    if (!connection) return throwError(() => new Error('Cannot execute an action without an active connection.'));
    return from(connection.invoke<unknown>('Execute', action)).pipe(map(version => committedVersion.assert(version)));
  }

  private handleChange(connection: HubConnection, change: StateChange): void {
    if (this.retired.has(change.syncId)) return;
    if (this.syncing) {
      if (change.syncId !== this.confirmed?.syncId && change.syncId !== this.observedGeneration) {
        this.observedGeneration = change.syncId;
        this.observation++;
      }
      this.buffer.push(change);
      return;
    }
    const confirmed = this.confirmed;
    if (this.needsSync) {
      this.buffer.push(change);
      this.resync(connection, change.syncId === confirmed?.syncId ? 'version_gap' : 'generation_change');
      return;
    }
    if (change.kind === 'ResetRequired') {
      if (change.syncId !== confirmed?.syncId) this.resync(connection, 'generation_change');
      return;
    }
    if (change.syncId === confirmed?.syncId && change.version <= confirmed.version) return;
    if (change.syncId !== confirmed?.syncId || change.version !== confirmed.version + 1) {
      this.buffer.push(change);
      this.resync(connection, change.syncId === confirmed?.syncId ? 'version_gap' : 'generation_change');
      return;
    }
    try {
      const candidate = gameState.assert(applyJsonPatch(confirmed, change.patch));
      this.validateDelta(confirmed, candidate, change);
      this.validateGame(candidate.game);
      this.events.next({ kind: 'change', change });
      this.confirmed = candidate;
    } catch (error) {
      this.resync(connection, 'version_gap');
      throw error;
    }
  }

  private validateDelta(previous: GameState, candidate: GameState, change: StateDelta): void {
    const gameChanged = change.gameVersion !== change.sourceGameVersion;
    if (
      candidate.syncId !== change.syncId ||
      candidate.version !== change.version ||
      previous.engine.gameVersion !== change.sourceGameVersion ||
      candidate.engine.gameVersion !== change.gameVersion ||
      change.gameVersion !== previous.engine.gameVersion + (gameChanged ? 1 : 0) ||
      (gameChanged && change.actions === null) ||
      (!gameChanged && (change.actions !== null || change.isRestore || touchesGame(change.patch)))
    ) {
      throw new Error('State change headers do not match the envelope.');
    }
  }

  private resync(connection: HubConnection, trigger: string): void {
    if (this.connection !== connection || this.syncing) return;
    this.syncing = true;
    this.needsSync = true;
    const requestId = ++this.requestId;
    const observation = this.observation;
    connection
      .invoke<unknown>('GetState', trigger)
      .then(answer => {
        if (this.connection !== connection || requestId !== this.requestId) return;
        const snapshot = memberState.assert(answer);
        if (observation !== this.observation && snapshot?.state.syncId !== this.observedGeneration) {
          this.syncing = false;
          this.resync(connection, 'generation_change');
          return;
        }
        if (snapshot) this.validateGame(snapshot.state.game);
        if (this.confirmed && this.confirmed.syncId !== snapshot?.state.syncId) this.retired.add(this.confirmed.syncId);
        const pending = this.buffer;
        this.buffer = [];
        for (const change of pending) if (change.syncId !== snapshot?.state.syncId) this.retired.add(change.syncId);
        this.events.next({ kind: 'reset', state: snapshot });
        this.confirmed = snapshot?.state ?? null;
        this.observedGeneration = snapshot?.state.syncId ?? null;
        this.syncing = false;
        this.needsSync = false;
        if (snapshot) {
          const matching = pending.filter((change): change is StateDelta => change.syncId === snapshot.state.syncId && change.kind === 'Delta');
          for (const change of matching.sort((a, b) => a.version - b.version)) this.handleChange(connection, change);
        }
      })
      .catch((error: unknown) => {
        if (this.connection !== connection || requestId !== this.requestId) return;
        this.syncing = false;
        if (error instanceof ArkErrors) console.error('Invalid member state', error.summary);
        throwError(() => error).subscribe();
      });
  }

  private close(reason: DisconnectedReason): void {
    this.requestId++;
    this.confirmed = null;
    this.syncing = false;
    this.needsSync = false;
    this.buffer = [];
    this.retired.clear();
    this.observedGeneration = null;
    this.observation = 0;
    const connection = this.connection;
    this.connection = undefined;
    this.gameId = undefined;
    void connection?.stop();
    this._state.set({ status: 'disconnected', reason });
  }
}
