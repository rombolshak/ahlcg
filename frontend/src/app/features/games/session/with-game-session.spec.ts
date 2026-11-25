import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { signalStore } from '@ngrx/signals';
import { type } from 'arktype';
import { config, Observable, of, Subject, throwError } from 'rxjs';
import { type Mock, vi } from 'vitest';
import { GameConnectionService, MemberState, MemberStateEvent, StateChange } from './game-connection.service';
import { withGameSession } from './with-game-session';

const testView = type({ items: 'string[]' });
const TestStore = signalStore(withGameSession(testView));

const addItem = (value: string): StateChange['actions'] => ({ add: [{ op: 'add', path: '/items/-', value }] });

const memberState = (version: number, items: string[], actions: MemberState['actions'] = addItem('x')): MemberState => ({
  version,
  view: { items },
  actions,
});
const change = (version: number, items: string[], actions: StateChange['actions'] = addItem('x')): StateChange => ({
  version,
  viewPatch: [{ op: 'replace', path: '/items', value: items }],
  actions,
});

describe('withGameSession', () => {
  let store: InstanceType<typeof TestStore>;
  let events: Subject<MemberStateEvent>;
  let inviteCode: ReturnType<typeof signal<string | null>>;
  let execute: ReturnType<typeof vi.fn<(action: string) => Observable<number | null>>>;
  let connect: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;
  let unhandled: Mock<(error: unknown) => void>;

  const reset = (state: MemberState | null) => {
    events.next({ kind: 'reset', state });
  };
  const apply = (next: StateChange) => {
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

    TestBed.configureTestingModule({
      providers: [
        TestStore,
        { provide: GameConnectionService, useValue: { memberStateEvents: events.asObservable(), inviteCode, connect, disconnect, execute } },
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

    inviteCode.set('K7M2QX');

    expect(store.inviteCode()).toBe('K7M2QX');
  });

  it('should connect through the connection service', () => {
    expect(connect).toHaveBeenCalledWith('game-1');
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
    reset({ version: 1, view: { items: 'x' }, actions: {} });
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

    apply({ version: 3, viewPatch: [{ op: 'remove', path: '/missing' }], actions: {} });
    await flush();

    expect(unhandled).toHaveBeenCalledOnce();
    expect(items()).toEqual(['a']);
    expect(store.availableActions()).toEqual(['add']);
  });

  it('should leave the view untouched when the patched view is invalid', async () => {
    reset(memberState(2, ['a']));

    apply({ version: 3, viewPatch: [{ op: 'replace', path: '/items', value: 'x' }], actions: {} });
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

    expect(items()).toEqual(['y', 'x']);

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
});
