import { inject, InjectionToken, Service, signal, Signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { ArkErrors, type } from 'arktype';
import { from, map, Observable, throwError } from 'rxjs';

export type ExitReason = 'NotAMember';
export type DisconnectedReason = 'initial' | 'server_rejected' | 'network_error';

export type GameConnectionState = { status: 'disconnected'; reason: DisconnectedReason } | { status: 'connecting' } | { status: 'connected' };

const exitReason = type("'NotAMember'");
const pingTimestamp = type('string.date.parse');

export type GameHubConnectionFactory = (url: string) => HubConnection;

export const GAME_HUB_CONNECTION_FACTORY = new InjectionToken<GameHubConnectionFactory>('Game hub connection factory', {
  factory: () => url => new HubConnectionBuilder().withUrl(url).withAutomaticReconnect().build(),
});

@Service()
export class GameConnectionService {
  private readonly connectionFactory = inject(GAME_HUB_CONNECTION_FACTORY);

  private readonly _state = signal<GameConnectionState>({ status: 'disconnected', reason: 'initial' });
  public readonly state: Signal<GameConnectionState> = this._state.asReadonly();

  private connection: HubConnection | undefined;
  private gameId: string | undefined;

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

    this._state.set({ status: 'connecting' });
    connection.start().then(
      () => {
        this._state.set({ status: 'connected' });
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

  private close(reason: DisconnectedReason): void {
    void this.connection?.stop();
    this.connection = undefined;
    this.gameId = undefined;
    this._state.set({ status: 'disconnected', reason });
  }
}
