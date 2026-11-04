import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';
import { type } from 'arktype';
import { config, Observable, of, Subject, throwError } from 'rxjs';
import { type Mock, vi } from 'vitest';
import { GameConnectionService } from './game-connection.service';
import { MemberState, MemberStateEvent, StateDelta } from './game-state.model';
import { delta, snapshot } from './testing/session-fixtures';
import { withGameSession } from './with-game-session';

const testView = type({ items: 'string[]' });
const TestStore = signalStore(withGameSession(testView));

const addItem = (value: string): MemberState['actions'] => ({ add: [{ op: 'add', path: '/items/-', value }] });

const memberState = (version: number, items: string[], actions: MemberState['actions'] = addItem('x')): MemberState => snapshot({ items }, version, actions);
const change = (version: number, items: string[], actions: MemberState['actions'] = addItem('x')): StateDelta =>
  delta(version, [{ op: 'replace', path: '/items', value: items }], actions);

describe('withGameSession', () => {
  let store: InstanceType<typeof TestStore>;
  let events: Subject<MemberStateEvent>;
  let inviteCode: ReturnType<typeof signal<string | null>>;
  let execute: ReturnType<typeof vi.fn<(action: string) => Observable<number | null>>>;
  let connect: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;
  let synchronize: ReturnType<typeof vi.fn>;
  let unhandled: Mock<(error: unknown) => void>;

  const reset = (state: MemberState | null) => {
    events.next({ kind: 'reset', state });
  };
  const apply = (next: StateDelta) => {
    events.next({ kind: 'change', change: next });
  };
  const flush = () =>
    new Promise<void>(resolve => {
      setTimeout(resolve);
    });
  const items = () => store.viewModel()?.items;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    unhandled = vi.fn<(error: unknown) => void>();
    config.onUnhandledError = unhandled;
    events = new Subject<MemberStateEvent>();
    inviteCode = signal<string | null>(null);
    execute = vi.fn<(action: string) => Observable<number | null>>().mockReturnValue(new Subject<number | null>());
    connect = vi.fn();
    disconnect = vi.fn();
    synchronize = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        TestStore,
        {
          provide: GameConnectionService,
          useValue: { memberStateEvents: events.asObservable(), inviteCode, connect, disconnect, execute, synchronize },
        },
      ],
    });
    store = TestBed.inject(TestStore);
    store.connect('game-1');
  });

  afterEach(() => {
    config.onUnhandledError = null;
  });

  it('should start loading', () => {
    expect(store.status()).toBe('loading');
    expect(store.viewModel()).toBeNull();
  });

  it('should expose the connection invite code', () => {
    expect(store.inviteCode()).toBeNull();

    reset(snapshot({ items: [] }, 1, {}, 'K7M2QX'));

    expect(store.inviteCode()).toBe('K7M2QX');
  });

  it('should connect through the connection service', () => {
    expect(connect).toHaveBeenCalledWith('game-1', expect.any(Function));
  });

  it('should become ready with the view on reset', () => {
    reset(memberState(2, ['a']));

    expect(store.status()).toBe('ready');
    expect(items()).toEqual(['a']);
  });

  it('should become empty on reset with null', () => {
    reset(memberState(2, ['a']));

    reset(null);

    expect(store.status()).toBe('empty');
    expect(store.viewModel()).toBeNull();
    expect(store.availableActions()).toEqual([]);
  });

  it('should fail on reset with an invalid view and stay loading', async () => {
    reset(snapshot({ items: 'x' }, 1));
    await flush();

    expect(unhandled).toHaveBeenCalledOnce();
    expect(store.status()).toBe('loading');
  });

  it('should apply a change to the view', () => {
    reset(memberState(2, ['a']));

    apply(change(3, ['a', 'b']));

    expect(items()).toEqual(['a', 'b']);
  });

  it('should leave the view untouched when a patch fails', async () => {
    reset(memberState(2, ['a']));

    apply(delta(3, [{ op: 'remove', path: '/missing' }]));
    await flush();

    expect(unhandled).toHaveBeenCalledOnce();
    expect(items()).toEqual(['a']);
    expect(store.availableActions()).toEqual(['add']);
  });

  it('should leave the view untouched when the patched view is invalid', async () => {
    reset(memberState(2, ['a']));

    apply(delta(3, [{ op: 'replace', path: '/items', value: 'x' }]));
    await flush();

    expect(unhandled).toHaveBeenCalledOnce();
    expect(items()).toEqual(['a']);
  });

  it('should fail when a change arrives before any view', async () => {
    apply(change(1, []));
    await flush();

    expect(unhandled).toHaveBeenCalledOnce();
  });

  it('should offer the available actions and keep holding them while one is pending', () => {
    reset(memberState(1, []));

    expect(store.availableActions()).toEqual(['add']);
    expect(store.holdsActions()).toBe(true);

    store.choose('add');

    expect(store.availableActions()).toEqual([]);
    expect(store.holdsActions()).toBe(true);
  });

  it('should hold no actions when the server offers none', () => {
    reset(memberState(1, [], {}));

    expect(store.availableActions()).toEqual([]);
    expect(store.holdsActions()).toBe(false);
  });

  it('should apply a chosen action before any server event', () => {
    reset(memberState(1, []));

    store.choose('add');

    expect(items()).toEqual(['x']);
    expect(execute).toHaveBeenCalledWith('add');
  });

  it('should refuse a choice while another is pending', () => {
    reset(memberState(1, []));
    store.choose('add');

    expect(() => {
      store.choose('add');
    }).toThrow();
  });

  it('should refuse a choice that is not available', () => {
    reset(memberState(1, []));

    expect(() => {
      store.choose('missing');
    }).toThrow();
    expect(execute).not.toHaveBeenCalled();
  });

  it('should show the action twice, then once, when the own change arrives before the answer', () => {
    const answer = new Subject<number | null>();
    execute.mockReturnValue(answer);
    reset(memberState(1, []));
    store.choose('add');

    apply(change(2, ['x']));

    expect(items()).toEqual(['x', 'x']);

    answer.next(2);

    expect(items()).toEqual(['x']);
    expect(store.availableActions()).toEqual(['add']);
  });

  it('should show the action once when the answer arrives before the own change', () => {
    const answer = new Subject<number | null>();
    execute.mockReturnValue(answer);
    reset(memberState(1, []));
    store.choose('add');

    answer.next(2);

    expect(items()).toEqual(['x']);

    apply(change(2, ['x']));

    expect(items()).toEqual(['x']);
    expect(store.availableActions()).toEqual(['add']);
  });

  it('should settle at once when the answer is already confirmed', () => {
    execute.mockReturnValue(of(1));
    reset(memberState(1, []));

    store.choose('add');

    expect(items()).toEqual([]);
    expect(store.availableActions()).toEqual(['add']);
  });

  it('should re-apply the pending action with the new patch when another member changes the view', () => {
    reset(memberState(1, []));
    store.choose('add');

    apply(change(2, ['y'], addItem('z')));

    expect(items()).toEqual(['y', 'z']);
  });

  it('should drop the pending action when it is no longer offered', () => {
    reset(memberState(1, []));
    store.choose('add');

    apply(change(2, ['y'], {}));

    expect(items()).toEqual(['y']);
    expect(store.holdsActions()).toBe(false);
  });

  it('should drop the pending action on a null answer', () => {
    execute.mockReturnValue(of(null));
    reset(memberState(1, []));

    store.choose('add');

    expect(items()).toEqual([]);
    expect(store.availableActions()).toEqual(['add']);
  });

  it('should drop the pending action when execute errors', async () => {
    execute.mockReturnValue(throwError(() => new Error('hub failure')));
    reset(memberState(1, []));

    store.choose('add');
    await flush();

    expect(unhandled).toHaveBeenCalledOnce();
    expect(items()).toEqual([]);
    expect(store.availableActions()).toEqual(['add']);
  });

  it('should reconcile a pending action against the state of a reset', () => {
    const answer = new Subject<number | null>();
    execute.mockReturnValue(answer);
    reset(memberState(1, []));
    store.choose('add');

    reset(memberState(3, ['y']));

    expect(items()).toEqual(['y']);

    answer.next(3);

    expect(items()).toEqual(['y']);
  });

  it('should drop the pending action when a reset has no state', () => {
    reset(memberState(1, []));
    store.choose('add');

    reset(null);
    reset(memberState(2, ['y']));

    expect(items()).toEqual(['y']);
    expect(store.availableActions()).toEqual(['add']);
  });

  it('should drop the pending action and keep the confirmed view when the re-applied patch is invalid', () => {
    reset(memberState(1, []));
    store.choose('add');

    apply(change(2, ['y'], { add: [{ op: 'replace', path: '/items', value: 'x' }] }));

    expect(items()).toEqual(['y']);
    expect(store.availableActions()).toEqual(['add']);
  });

  it('should not settle a later action with the late answer of a dropped one', () => {
    const first = new Subject<number | null>();
    const second = new Subject<number | null>();
    execute.mockReturnValueOnce(first).mockReturnValueOnce(second);
    reset(memberState(1, []));
    store.choose('add');
    apply(change(2, ['y'], {}));
    apply(change(3, ['y']));
    store.choose('add');

    first.next(null);

    expect(items()).toEqual(['y', 'x']);
    expect(store.availableActions()).toEqual([]);
  });

  it('should drop the pending action and disconnect', () => {
    reset(memberState(1, []));
    store.choose('add');

    store.disconnect();

    expect(disconnect).toHaveBeenCalled();
    expect(items()).toEqual([]);
    expect(store.availableActions()).toEqual(['add']);
  });
  it('should keep an optimistic game action through an engine-only revision', () => {
    const answer = new Subject<number | null>();
    execute.mockReturnValue(answer);
    const initial = memberState(1, []);
    reset(initial);
    store.choose('add');
    answer.next(2);

    apply({
      kind: 'Delta',
      syncId: initial.state.syncId,
      version: 2,
      sourceGameVersion: 1,
      gameVersion: 1,
      patch: [
        { op: 'replace', path: '/version', value: 2 },
        { op: 'replace', path: '/engine/inviteCode', value: 'ABCDEF' },
      ],
      actions: null,
      isRestore: false,
    });

    expect(items()).toEqual(['x']);
    expect(store.availableActions()).toEqual([]);
    expect(store.inviteCode()).toBe('ABCDEF');
    expect(store.engine()?.gameVersion).toBe(1);
  });

  it('should cancel a prediction on a committed restore even when its action is still offered', () => {
    reset(memberState(1, []));
    store.choose('add');

    apply({ ...change(2, ['restored']), isRestore: true });

    expect(items()).toEqual(['restored']);
    expect(store.availableActions()).toEqual(['add']);
  });

  it('should reject a candidate engine and game atomically when headers disagree', async () => {
    reset(memberState(1, ['before']));
    const next = change(2, ['after']);

    apply({ ...next, gameVersion: 9 });
    await flush();

    expect(items()).toEqual(['before']);
    expect(store.engine()?.gameVersion).toBe(1);
    expect(unhandled).toHaveBeenCalledOnce();
  });

  it('should reject an optimistic action patch that writes engine state', async () => {
    const initial = memberState(1, []);
    reset(initial);
    reset({ ...initial, actions: { add: [{ op: 'replace', path: '/engine/inviteCode', value: 'bad' }] } });

    expect(items()).toEqual([]);
    await flush();
    expect(store.engine()?.inviteCode).toBeNull();
    expect(unhandled).toHaveBeenCalledOnce();
  });
  it('should synchronize an acknowledged commit that was not delivered without resending the action', () => {
    const answer = new Subject<number | null>();
    execute.mockReturnValue(answer);
    reset(memberState(1, []));
    store.choose('add');

    answer.next(2);

    expect(synchronize).toHaveBeenCalledOnce();
    expect(execute).toHaveBeenCalledOnce();
    expect(store.availableActions()).toEqual([]);
    reset(memberState(2, ['x']));
    expect(items()).toEqual(['x']);
    expect(store.availableActions()).toEqual(['add']);
    expect(execute).toHaveBeenCalledOnce();
  });
});
