import { inject, InjectionToken, Service, signal, Signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { ArkErrors, type } from 'arktype';
import { from, map, Observable, Subject, Subscription, throwError } from 'rxjs';

export type ExitReason = 'NotAMember';
export type DisconnectedReason = 'initial' | 'server_rejected' | 'network_error';

export type GameConnectionState = { status: 'disconnected'; reason: DisconnectedReason } | { status: 'connecting' } | { status: 'connected' };

const exitReason = type("'NotAMember'");
const pingTimestamp = type('string.date.parse');
const committedVersion = type('number.integer | null');
const inviteCode = type('string | null');

const operation = type({ op: "'add' | 'replace' | 'test'", path: 'string', value: 'unknown' })
  .or({ op: "'remove'", path: 'string' })
  .or({ op: "'move' | 'copy'", from: 'string', path: 'string' });
const actions = type({ '[string]': operation.array() });
const memberState = type({ version: 'number.integer', view: 'unknown', actions }).or('null');
const stateChange = type({ version: 'number.integer', viewPatch: operation.array(), actions });

export type MemberState = NonNullable<typeof memberState.infer>;
export type StateChange = typeof stateChange.infer;
export type MemberStateEvent = { kind: 'reset'; state: MemberState | null } | { kind: 'change'; change: StateChange };

export type GameHubConnectionFactory = (url: string) => HubConnection;

export const GAME_HUB_CONNECTION_FACTORY = new InjectionToken<GameHubConnectionFactory>('Game hub connection factory', {
  factory: () => url => new HubConnectionBuilder().withUrl(url).withAutomaticReconnect().build(),
});

@Service()
export class GameConnectionService {
  private readonly connectionFactory = inject(GAME_HUB_CONNECTION_FACTORY);

  private readonly _state = signal<GameConnectionState>({ status: 'disconnected', reason: 'initial' });
  public readonly state: Signal<GameConnectionState> = this._state.asReadonly();

  private readonly _inviteCode = signal<string | null>(null);
  public readonly inviteCode: Signal<string | null> = this._inviteCode.asReadonly();

  private readonly events = new Subject<MemberStateEvent>();
  public readonly memberStateEvents: Observable<MemberStateEvent> = this.events.asObservable();

  private connection: HubConnection | undefined;
  private gameId: string | undefined;
  private lastVersion: number | null = null;
  private syncing = false;
  private buffer: StateChange[] = [];
  private resyncSubscription: Subscription | undefined;

  public connect(gameId: string): void {
    if (this.gameId === gameId) return;
    this.close('initial');

    const connection = this.connectionFactory(`/api/game?gameId=${gameId}`);
    this.connection = connection;
    this.gameId = gameId;

    connection.onreconnecting(() => {
      this._state.set({ status: 'connecting' });
    });
    connection.onreconnected(() => {
      this._state.set({ status: 'connected' });
      this.resync(connection);
    });
    connection.onclose(error => {
      if (error) this.close('network_error');
    });
    connection.on('Exit', (reason: unknown) => {
      const validated = exitReason(reason);
      if (validated instanceof ArkErrors) {
        console.error('Invalid exit reason', validated.summary);
        return validated.throw();
      }

      this.close('server_rejected');
    });
    connection.on('StateChanged', (payload: unknown) => {
      if (this.connection !== connection) return;

      const validated = stateChange(payload);
      if (validated instanceof ArkErrors) {
        console.error('Invalid state change', validated.summary);
        return validated.throw();
      }

      this.handleChange(connection, validated);
    });

    connection.on('InviteCodeChanged', (payload: unknown) => {
      if (this.connection !== connection) return;

      const validated = inviteCode(payload);
      if (validated instanceof ArkErrors) {
        console.error('Invalid invite code', validated.summary);
        return validated.throw();
      }

      this._inviteCode.set(validated);
    });

    this._state.set({ status: 'connecting' });
    connection.start().then(
      () => {
        this._state.set({ status: 'connected' });
        this.resync(connection);
      },
      () => {
        this.close('network_error');
      },
    );
  }

  public disconnect(): void {
    this.close('initial');
  }

  public ping(): Observable<Date> {
    const connection = this.connection;
    if (!connection) return throwError(() => new Error('Cannot ping without an active connection.'));

    return from(connection.invoke<unknown>('Ping')).pipe(
      map(timestamp => {
        const validated = pingTimestamp(timestamp);
        if (validated instanceof ArkErrors) {
          console.error('Invalid ping timestamp', validated.summary);
          return validated.throw();
        }

        return validated;
      }),
    );
  }

  public execute(action: string): Observable<number | null> {
    const connection = this.connection;
    if (!connection) return throwError(() => new Error('Cannot execute an action without an active connection.'));

    return from(connection.invoke<unknown>('Execute', action)).pipe(
      map(version => {
        const validated = committedVersion(version);
        if (validated instanceof ArkErrors) {
          console.error('Invalid committed version', validated.summary);
          return validated.throw();
        }

        return validated;
      }),
    );
  }

  private handleChange(connection: HubConnection, change: StateChange): void {
    if (this.syncing) {
      this.buffer.push(change);
      return;
    }

    const last = this.lastVersion;
    if (last !== null && change.version <= last) return;

    if (last !== null && change.version === last + 1) {
      this.lastVersion = change.version;
      this.events.next({ kind: 'change', change });
      return;
    }

    this.buffer.push(change);
    this.resync(connection);
  }

  private resync(connection: HubConnection): void {
    if (this.connection !== connection) return;

    this.syncing = true;
    this.resyncSubscription?.unsubscribe();
    this.resyncSubscription = from(connection.invoke<unknown>('GetState'))
      .pipe(
        map(answer => {
          const validated = memberState(answer);
          if (validated instanceof ArkErrors) {
            console.error('Invalid member state', validated.summary);
            return validated.throw();
          }

          return validated;
        }),
      )
      .subscribe({
        next: state => {
          this.events.next({ kind: 'reset', state });
          this.lastVersion = state?.version ?? null;
          this.syncing = false;
          this.drainBuffer(connection, state !== null);
        },
        error: (error: unknown) => {
          this.syncing = false;
          throw error;
        },
      });
  }

  private drainBuffer(connection: HubConnection, hasState: boolean): void {
    const pending = this.buffer.sort((a, b) => a.version - b.version);
    this.buffer = [];
    if (!hasState) return;

    for (const change of pending) this.handleChange(connection, change);
  }

  private close(reason: DisconnectedReason): void {
    this.resyncSubscription?.unsubscribe();
    this.resyncSubscription = undefined;
    this.lastVersion = null;
    this.syncing = false;
    this.buffer = [];
    void this.connection?.stop();
    this.connection = undefined;
    this.gameId = undefined;
    this._inviteCode.set(null);
    this._state.set({ status: 'disconnected', reason });
  }
}
