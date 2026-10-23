import { TestBed } from '@angular/core/testing';
import { MemberState } from '@features/games/game-connection.service';
import { vi } from 'vitest';
import { FixtureGameStore } from './fixture-game.store';
import { FixtureView } from './fixture-view.model';

const view: FixtureView = {
  shared: 3,
  revealed: null,
  ownSecret: 7,
  others: { 'user-2': 'Positive' },
  journal: [{ key: 'fixture.revealed', parameters: { value: 4 } }],
};

const memberState = (version: number, memberView: unknown): MemberState => ({ version, view: memberView, actions: {} });

describe('FixtureGameStore', () => {
  let store: InstanceType<typeof FixtureGameStore>;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [FixtureGameStore] });
    store = TestBed.inject(FixtureGameStore);
  });

  it('should start loading', () => {
    expect(store.status()).toBe('loading');
    expect(store.view()).toBeNull();
  });

  it('should become ready with the view on reset', () => {
    store.reset(memberState(2, view));

    expect(store.status()).toBe('ready');
    expect(store.version()).toBe(2);
    expect(store.view()).toEqual(view);
  });

  it('should become empty on reset with null', () => {
    store.reset(memberState(2, view));

    store.reset(null);

    expect(store.status()).toBe('empty');
    expect(store.view()).toBeNull();
  });

  it('should throw on reset with an invalid view', () => {
    expect(() => {
      store.reset(memberState(1, { shared: 'x' }));
    }).toThrow();
    expect(store.status()).toBe('loading');
  });

  it('should apply a change to the view', () => {
    store.reset(memberState(2, view));

    store.apply({ version: 3, viewPatch: [{ op: 'replace', path: '/shared', value: 4 }], actions: {} });

    expect(store.version()).toBe(3);
    expect(store.view()?.shared).toBe(4);
  });

  it('should leave the view untouched when a patch fails', () => {
    store.reset(memberState(2, view));

    expect(() => {
      store.apply({ version: 3, viewPatch: [{ op: 'remove', path: '/missing' }], actions: {} });
    }).toThrow();

    expect(store.version()).toBe(2);
    expect(store.view()).toEqual(view);
  });

  it('should leave the view untouched when the patched view is invalid', () => {
    store.reset(memberState(2, view));

    expect(() => {
      store.apply({ version: 3, viewPatch: [{ op: 'replace', path: '/shared', value: 'x' }], actions: {} });
    }).toThrow();

    expect(store.version()).toBe(2);
    expect(store.view()).toEqual(view);
  });

  it('should throw when a change arrives before any view', () => {
    expect(() => {
      store.apply({ version: 1, viewPatch: [], actions: {} });
    }).toThrow();
  });
});
