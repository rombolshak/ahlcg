import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InputManagerService } from '@core/input-manager.service';
import { GameConnectionService, GameConnectionState, MemberState, MemberStateEvent } from '@features/games/game-connection.service';
import { GameMember, GamesService } from '@features/games/games.service';
import { getTranslocoModule } from '@testing/transloco.testing';
import { NEVER, of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { FixtureGameComponent } from './fixture-game.component';
import { FixtureView } from './fixture-view.model';

const view: FixtureView = {
  shared: 3,
  revealed: null,
  ownSecret: 7,
  others: { 'user-2': 'Positive' },
  journal: [
    { key: 'fixture.revealed', parameters: { value: 4 } },
    { key: 'fixture.unknown', parameters: {} },
  ],
};

const memberState = (memberView: FixtureView): MemberState => ({ version: 1, view: memberView, actions: {} });

describe('FixtureGameComponent', () => {
  let fixture: ComponentFixture<FixtureGameComponent>;
  let events: Subject<MemberStateEvent>;
  let state: ReturnType<typeof signal<GameConnectionState>>;
  let connect: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;
  let members: ReturnType<typeof vi.fn>;
  let registerGlobal: ReturnType<typeof vi.fn>;

  const element = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testId=${testId}]`);
  const text = (testId: string) => element(testId)?.textContent.trim();
  const has = (testId: string) => element(testId) !== null;

  const emit = async (event: MemberStateEvent) => {
    events.next(event);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    events = new Subject<MemberStateEvent>();
    state = signal<GameConnectionState>({ status: 'connected' });
    connect = vi.fn();
    disconnect = vi.fn();
    registerGlobal = vi.fn();
    members = vi.fn().mockReturnValue(of<GameMember[]>([{ userId: 'user-2', userName: 'Roland', isAnonymous: false, isOnline: true }]));

    await TestBed.configureTestingModule({
      imports: [FixtureGameComponent, getTranslocoModule()],
      providers: [
        provideZonelessChangeDetection(),
        { provide: GameConnectionService, useValue: { state, connect, disconnect, memberStateEvents: events.asObservable() } },
        { provide: GamesService, useValue: { members } },
        { provide: InputManagerService, useValue: { registerGlobal } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FixtureGameComponent);
    fixture.componentRef.setInput('id', 'game-1');
    await fixture.whenStable();
  });

  it('should connect to the game and register the cancel handler', () => {
    expect(connect).toHaveBeenCalledWith('game-1');
    expect(registerGlobal).toHaveBeenCalledWith(expect.objectContaining({ cancel: expect.any(Function) as unknown }));
  });

  it('should disconnect when destroyed', () => {
    fixture.destroy();

    expect(disconnect).toHaveBeenCalled();
  });

  it('should show the loading state before any state arrives', () => {
    expect(has('loading')).toBe(true);
  });

  it('should show the rejected state', async () => {
    state.set({ status: 'disconnected', reason: 'server_rejected' });
    await fixture.whenStable();

    expect(has('rejected')).toBe(true);
    expect(has('loading')).toBe(false);
  });

  it('should show the network error state', async () => {
    state.set({ status: 'disconnected', reason: 'network_error' });
    await fixture.whenStable();

    expect(has('network-error')).toBe(true);
  });

  it('should show the empty state when the game has no state', async () => {
    await emit({ kind: 'reset', state: null });

    expect(has('empty')).toBe(true);
  });

  it('should show the shared counter, the own secret and no revealed value', async () => {
    await emit({ kind: 'reset', state: memberState(view) });

    expect(text('shared')).toBe('3');
    expect(text('own-secret')).toBe('7');
    expect(text('revealed')).toBe('None yet');
  });

  it('should show a revealed value of zero', async () => {
    await emit({ kind: 'reset', state: memberState({ ...view, revealed: 0 }) });

    expect(text('revealed')).toBe('0');
  });

  it('should label another member by name with their sign', async () => {
    await emit({ kind: 'reset', state: memberState(view) });

    expect(text('other-label')).toBe('Roland');
    expect(text('other-sign')).toBe('Positive');
    expect(members).toHaveBeenCalledWith('game-1');
  });

  it('should fall back to the anonymous label when the member has no name', async () => {
    members.mockReturnValue(of<GameMember[]>([{ userId: 'user-2', userName: null, isAnonymous: true, isOnline: true }]));

    await emit({ kind: 'reset', state: memberState(view) });

    expect(text('other-label')).toBe('Anonymous');
  });

  it('should refetch the names when a member joins', async () => {
    await emit({ kind: 'reset', state: memberState(view) });

    await emit({ kind: 'change', change: { version: 2, viewPatch: [{ op: 'add', path: '/others/user-3', value: 'Zero' }], actions: {} } });

    expect(members).toHaveBeenCalledTimes(2);
  });

  it('should keep showing the known names while the members reload after a join', async () => {
    await emit({ kind: 'reset', state: memberState(view) });
    members.mockReturnValue(NEVER);

    events.next({ kind: 'change', change: { version: 2, viewPatch: [{ op: 'add', path: '/others/user-3', value: 'Zero' }], actions: {} } });
    TestBed.tick();

    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testId=other-label]')).map(label => label.textContent.trim());
    expect(labels).toEqual(['Roland', 'Anonymous']);
  });

  it('should say so when alone at the table', async () => {
    await emit({ kind: 'reset', state: memberState({ ...view, others: {} }) });

    expect(has('alone')).toBe(true);
  });

  it('should render journal entries newest first from their key', async () => {
    await emit({ kind: 'reset', state: memberState(view) });

    const entries = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[data-testId=journal-entry]')).map(entry => entry.textContent.trim());
    expect(entries).toEqual(['fixture.unknown', 'Revealed 4']);
  });

  it('should say so when the journal is empty', async () => {
    await emit({ kind: 'reset', state: memberState({ ...view, journal: [] }) });

    expect(has('journal-empty')).toBe(true);
  });

  it('should update the view when a change arrives', async () => {
    await emit({ kind: 'reset', state: memberState(view) });

    await emit({ kind: 'change', change: { version: 2, viewPatch: [{ op: 'replace', path: '/shared', value: 9 }], actions: {} } });

    expect(text('shared')).toBe('9');
  });
});
