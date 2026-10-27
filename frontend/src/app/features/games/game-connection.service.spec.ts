import { TestBed } from '@angular/core/testing';
import { HubConnection } from '@microsoft/signalr';
import { config } from 'rxjs';
import { type Mock, vi } from 'vitest';
import { GAME_HUB_CONNECTION_FACTORY, GameConnectionService, MemberState, MemberStateEvent, StateChange } from './game-connection.service';

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

function memberState(version: number): MemberState {
  return { version, view: {}, actions: {} };
}

function stateChange(version: number): StateChange {
  return { version, viewPatch: [{ op: 'replace', path: '/shared', value: version }], actions: {} };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function flush(): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve);
  });
}

function createFakeConnection(startResult: Promise<void> = Promise.resolve()) {
  let reconnectingCallback: (() => void) | undefined;
  let reconnectedCallback: (() => void) | undefined;
  let closeCallback: ((error?: Error) => void) | undefined;
  let exitHandler: ((reason: unknown) => void) | undefined;
  let stateChangedHandler: ((payload: unknown) => void) | undefined;
  const answers: Record<string, unknown> = { Ping: '2026-01-01T00:00:00Z', GetState: null };

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
      if (method === 'StateChanged') stateChangedHandler = handler as (payload: unknown) => void;
    }),
    off: vi.fn(),
    start: vi.fn(() => startResult),
    stop: vi.fn().mockResolvedValue(undefined),
    invoke: vi.fn((method: string) => Promise.resolve(answers[method])),
  };

  return {
    connection,
    triggerReconnecting: () => reconnectingCallback?.(),
    triggerReconnected: () => reconnectedCallback?.(),
    triggerClose: (error?: Error) => closeCallback?.(error),
    triggerExit: (reason: unknown) => exitHandler?.(reason),
    triggerStateChanged: (payload: unknown) => stateChangedHandler?.(payload),
    answer: (method: string, value: unknown) => {
      answers[method] = value;
    },
    invocations: (method: string) => connection.invoke.mock.calls.filter(call => call[0] === method).length,
  };
}

describe('GameConnectionService', () => {
  let service: GameConnectionService;
  let factory: ReturnType<typeof vi.fn>;
  let fake: ReturnType<typeof createFakeConnection>;
  let events: MemberStateEvent[];

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
    events = [];
    service.memberStateEvents.subscribe(event => events.push(event));
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
    fake.answer('Ping', 'not-a-date');

    const error = await new Promise<unknown>(resolve => service.ping().subscribe({ error: resolve }));

    expect(error).toBeDefined();
  });

  it('should surface the version the server returns from Execute', async () => {
    service.connect('game-1');
    fake.answer('Execute', 4);

    const version = await new Promise<number | null>(resolve => service.execute('shared:inc').subscribe(resolve));

    expect(fake.connection.invoke).toHaveBeenCalledWith('Execute', 'shared:inc');
    expect(version).toBe(4);
  });

  it('should surface a null answer from Execute', async () => {
    service.connect('game-1');
    fake.answer('Execute', null);

    const version = await new Promise<number | null>(resolve => service.execute('shared:inc').subscribe(resolve));

    expect(version).toBeNull();
  });

  it('should error an execute when the server returns an invalid version', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    service.connect('game-1');
    fake.answer('Execute', 'four');

    const error = await new Promise<unknown>(resolve => service.execute('shared:inc').subscribe({ error: resolve }));

    expect(error).toBeDefined();
  });

  it('should error an execute when there is no connection', async () => {
    const error = await new Promise<unknown>(resolve => service.execute('shared:inc').subscribe({ error: resolve }));

    expect(error).toBeInstanceOf(Error);
  });

  describe('state sync', () => {
    it('should emit a reset with the GetState answer once start resolves', async () => {
      service.connect('game-1');
      fake.answer('GetState', memberState(3));

      await flush();

      expect(events).toEqual([{ kind: 'reset', state: memberState(3) }]);
    });

    it('should emit a reset with null when GetState answers null', async () => {
      service.connect('game-1');

      await flush();

      expect(events).toEqual([{ kind: 'reset', state: null }]);
    });

    it('should call GetState again and emit a reset after a reconnect', async () => {
      service.connect('game-1');
      fake.answer('GetState', memberState(1));
      await flush();
      fake.answer('GetState', memberState(4));

      fake.triggerReconnected();
      await flush();

      expect(fake.invocations('GetState')).toBe(2);
      expect(events).toEqual([
        { kind: 'reset', state: memberState(1) },
        { kind: 'reset', state: memberState(4) },
      ]);
    });

    it('should emit a change that directly follows the known version', async () => {
      service.connect('game-1');
      fake.answer('GetState', memberState(1));
      await flush();

      fake.triggerStateChanged(stateChange(2));

      expect(events.at(-1)).toEqual({ kind: 'change', change: stateChange(2) });
      expect(fake.invocations('GetState')).toBe(1);
    });

    it('should drop a stale change', async () => {
      service.connect('game-1');
      fake.answer('GetState', memberState(3));
      await flush();

      fake.triggerStateChanged(stateChange(3));
      fake.triggerStateChanged(stateChange(2));

      expect(events).toEqual([{ kind: 'reset', state: memberState(3) }]);
      expect(fake.invocations('GetState')).toBe(1);
    });

    it('should call GetState again on a version gap', async () => {
      service.connect('game-1');
      fake.answer('GetState', memberState(1));
      await flush();
      fake.answer('GetState', memberState(3));

      fake.triggerStateChanged(stateChange(3));
      await flush();

      expect(fake.invocations('GetState')).toBe(2);
      expect(events).toEqual([
        { kind: 'reset', state: memberState(1) },
        { kind: 'reset', state: memberState(3) },
      ]);
    });

    it('should buffer changes during an in-flight GetState and apply them in order afterwards', async () => {
      let resolveState: (state: MemberState) => void = () => undefined;
      service.connect('game-1');
      fake.answer(
        'GetState',
        new Promise<MemberState>(resolve => {
          resolveState = resolve;
        }),
      );
      await flush();

      fake.triggerStateChanged(stateChange(3));
      fake.triggerStateChanged(stateChange(2));

      expect(events).toEqual([]);

      resolveState(memberState(1));
      await flush();

      expect(events).toEqual([
        { kind: 'reset', state: memberState(1) },
        { kind: 'change', change: stateChange(2) },
        { kind: 'change', change: stateChange(3) },
      ]);
      expect(fake.invocations('GetState')).toBe(1);
    });

    it('should call GetState when a change arrives and no version is known', async () => {
      service.connect('game-1');
      await flush();

      fake.triggerStateChanged(stateChange(1));
      await flush();

      expect(fake.invocations('GetState')).toBe(2);
      expect(events.some(event => event.kind === 'change')).toBe(false);
    });

    it('should drop a buffered change that is not newer than the GetState answer', async () => {
      let resolveState: (state: MemberState) => void = () => undefined;
      service.connect('game-1');
      fake.answer(
        'GetState',
        new Promise<MemberState>(resolve => {
          resolveState = resolve;
        }),
      );
      await flush();
      fake.triggerStateChanged(stateChange(2));

      resolveState(memberState(2));
      await flush();

      expect(events).toEqual([{ kind: 'reset', state: memberState(2) }]);
    });

    it('should drop a change that arrives after an answer that already includes it', async () => {
      service.connect('game-1');
      fake.answer('GetState', memberState(2));
      await flush();

      fake.triggerStateChanged(stateChange(2));

      expect(events).toEqual([{ kind: 'reset', state: memberState(2) }]);
    });

    it('should emit nothing and throw on an invalid state change', async () => {
      service.connect('game-1');
      fake.answer('GetState', memberState(1));
      await flush();

      expect(() => fake.triggerStateChanged({ version: 2, viewPatch: [{ op: 'bogus', path: '/x' }], actions: {} })).toThrow();

      expect(events).toEqual([{ kind: 'reset', state: memberState(1) }]);
    });

    it('should forget the known version on disconnect', async () => {
      service.connect('game-1');
      fake.answer('GetState', memberState(1));
      await flush();
      service.disconnect();

      service.connect('game-1');
      fake.triggerStateChanged(stateChange(2));

      expect(events.some(event => event.kind === 'change')).toBe(false);
    });

    it('should ignore a change delivered by a connection that was replaced', async () => {
      service.connect('game-1');
      await flush();
      const first = fake;
      service.disconnect();
      service.connect('game-1');
      const second = fake;
      second.answer('GetState', memberState(1));
      await flush();

      first.triggerStateChanged(stateChange(2));

      expect(second).not.toBe(first);
      expect(events.some(event => event.kind === 'change')).toBe(false);
      expect(first.invocations('GetState')).toBe(1);
    });

    it('should not emit the answer of a GetState for a connection that was closed', async () => {
      const state = deferred<MemberState>();
      service.connect('game-1');
      fake.answer('GetState', state.promise);
      await flush();

      service.disconnect();
      state.resolve(memberState(1));
      await flush();

      expect(events).toEqual([]);
    });

    it('should ignore the late answer of a GetState superseded by a reconnect', async () => {
      const late = deferred<MemberState>();
      service.connect('game-1');
      fake.answer('GetState', late.promise);
      await flush();
      fake.answer('GetState', memberState(5));

      fake.triggerReconnected();
      await flush();
      late.resolve(memberState(1));
      await flush();

      expect(events).toEqual([{ kind: 'reset', state: memberState(5) }]);
    });

    it('should resync again when draining the buffer finds a gap', async () => {
      const first = deferred<MemberState>();
      service.connect('game-1');
      fake.answer('GetState', first.promise);
      await flush();
      fake.triggerStateChanged(stateChange(2));
      fake.triggerStateChanged(stateChange(4));
      fake.triggerStateChanged(stateChange(5));
      fake.answer('GetState', memberState(4));

      first.resolve(memberState(1));
      await flush();

      expect(fake.invocations('GetState')).toBe(2);
      expect(events).toEqual([
        { kind: 'reset', state: memberState(1) },
        { kind: 'change', change: stateChange(2) },
        { kind: 'reset', state: memberState(4) },
        { kind: 'change', change: stateChange(5) },
      ]);
    });

    describe('when GetState fails', () => {
      let unhandled: Mock<(error: unknown) => void>;

      beforeEach(() => {
        unhandled = vi.fn<(error: unknown) => void>();
        config.onUnhandledError = unhandled;
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
      });

      afterEach(() => {
        config.onUnhandledError = null;
        vi.restoreAllMocks();
      });

      it('should emit nothing and resync on the next change when GetState is rejected', async () => {
        const state = deferred<MemberState>();
        service.connect('game-1');
        fake.answer('GetState', state.promise);
        await flush();

        state.reject(new Error('hub failure'));
        await flush();
        await flush();
        fake.answer('GetState', null);
        fake.triggerStateChanged(stateChange(1));

        expect(events).toEqual([]);
        expect(unhandled).toHaveBeenCalledOnce();
        expect(fake.invocations('GetState')).toBe(2);
      });

      it('should emit nothing when GetState answers an invalid payload', async () => {
        service.connect('game-1');
        fake.answer('GetState', { version: 'one' });

        await flush();
        await flush();

        expect(events).toEqual([]);
        expect(unhandled).toHaveBeenCalledOnce();
      });
    });
  });
});
