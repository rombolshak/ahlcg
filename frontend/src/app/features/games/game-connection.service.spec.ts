import { TestBed } from '@angular/core/testing';
import { HubConnection } from '@microsoft/signalr';
import { vi } from 'vitest';
import { GAME_HUB_CONNECTION_FACTORY, GameConnectionService } from './game-connection.service';

interface FakeHubConnection {
  onreconnecting: ReturnType<typeof vi.fn>;
  onreconnected: ReturnType<typeof vi.fn>;
  onclose: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  invoke: ReturnType<typeof vi.fn>;
}

function createFakeConnection(startResult: Promise<void> = Promise.resolve()) {
  let reconnectingCallback: (() => void) | undefined;
  let reconnectedCallback: (() => void) | undefined;
  let closeCallback: ((error?: Error) => void) | undefined;
  let exitHandler: ((reason: unknown) => void) | undefined;

  const connection: FakeHubConnection = {
    onreconnecting: vi.fn((cb: () => void) => {
      reconnectingCallback = cb;
    }),
    onreconnected: vi.fn((cb: () => void) => {
      reconnectedCallback = cb;
    }),
    onclose: vi.fn((cb: (error?: Error) => void) => {
      closeCallback = cb;
    }),
    on: vi.fn((method: string, handler: (arg: never) => void) => {
      if (method === 'Exit') exitHandler = handler as (reason: unknown) => void;
    }),
    off: vi.fn(),
    start: vi.fn(() => startResult),
    stop: vi.fn().mockResolvedValue(undefined),
    invoke: vi.fn().mockResolvedValue('2026-01-01T00:00:00Z'),
  };

  return {
    connection,
    triggerReconnecting: () => reconnectingCallback?.(),
    triggerReconnected: () => reconnectedCallback?.(),
    triggerClose: (error?: Error) => closeCallback?.(error),
    triggerExit: (reason: unknown) => exitHandler?.(reason),
  };
}

describe('GameConnectionService', () => {
  let service: GameConnectionService;
  let factory: ReturnType<typeof vi.fn>;
  let fake: ReturnType<typeof createFakeConnection>;

  beforeEach(() => {
    fake = createFakeConnection();
    factory = vi.fn(() => {
      fake = createFakeConnection();
      return fake.connection as unknown as HubConnection;
    });

    TestBed.configureTestingModule({
      providers: [{ provide: GAME_HUB_CONNECTION_FACTORY, useValue: factory }],
    });
    service = TestBed.inject(GameConnectionService);
  });

  it('should build the connection url from the game id', () => {
    service.connect('game-1');

    expect(factory).toHaveBeenCalledWith('/api/game?gameId=game-1');
  });

  it('should transition from connecting to connected once start resolves', async () => {
    service.connect('game-1');

    expect(service.state()).toEqual({ status: 'connecting' });

    await Promise.resolve();

    expect(service.state()).toEqual({ status: 'connected' });
  });

  it('should ignore a second connect to the same game', () => {
    service.connect('game-1');
    service.connect('game-1');

    expect(factory).toHaveBeenCalledOnce();
    expect(fake.connection.stop).not.toHaveBeenCalled();
  });

  it('should replace the connection when connecting to a different game', () => {
    service.connect('game-1');
    const first = fake.connection;

    service.connect('game-2');

    expect(first.stop).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenLastCalledWith('/api/game?gameId=game-2');
  });

  it('should move to disconnected(server_rejected) and stop the connection on an Exit message', () => {
    service.connect('game-1');

    fake.triggerExit('NotAMember');

    expect(service.state()).toEqual({ status: 'disconnected', reason: 'server_rejected' });
    expect(fake.connection.stop).toHaveBeenCalledOnce();
  });

  it('should fail validation rather than accept an unrecognised exit reason', () => {
    service.connect('game-1');

    expect(() => fake.triggerExit('Whatever')).toThrow();
  });

  it('should map onreconnecting and onreconnected to connecting and connected', async () => {
    service.connect('game-1');
    await Promise.resolve();

    fake.triggerReconnecting();

    expect(service.state()).toEqual({ status: 'connecting' });

    fake.triggerReconnected();

    expect(service.state()).toEqual({ status: 'connected' });
  });

  it('should map onclose to disconnected(network_error)', () => {
    service.connect('game-1');

    fake.triggerClose(new Error('transport lost'));

    expect(service.state()).toEqual({ status: 'disconnected', reason: 'network_error' });
  });

  it('should leave the state alone when the connection closes without an error', async () => {
    service.connect('game-1');
    await Promise.resolve();

    fake.triggerClose();

    expect(service.state()).toEqual({ status: 'connected' });
  });

  it('should return to disconnected(initial) on disconnect', async () => {
    service.connect('game-1');
    await Promise.resolve();

    service.disconnect();

    expect(service.state()).toEqual({ status: 'disconnected', reason: 'initial' });
    expect(fake.connection.stop).toHaveBeenCalledOnce();
  });

  it('should allow reconnecting to the same game after a disconnect', () => {
    service.connect('game-1');
    service.disconnect();

    service.connect('game-1');

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('should surface the timestamp the server returns from Ping', async () => {
    service.connect('game-1');

    const timestamp = await new Promise<Date>(resolve => service.ping().subscribe(resolve));

    expect(fake.connection.invoke).toHaveBeenCalledWith('Ping');
    expect(timestamp).toEqual(new Date('2026-01-01T00:00:00Z'));
  });

  it('should error a ping when there is no connection', async () => {
    const error = await new Promise<unknown>(resolve => service.ping().subscribe({ error: resolve }));

    expect(error).toBeInstanceOf(Error);
  });

  it('should error a ping when the server returns an invalid timestamp', async () => {
    service.connect('game-1');
    fake.connection.invoke.mockResolvedValue('not-a-date');

    const error = await new Promise<unknown>(resolve => service.ping().subscribe({ error: resolve }));

    expect(error).toBeDefined();
  });
});
