import { computed, inject } from '@angular/core';
import { applyJsonPatch } from '@core/apply-json-patch';
import { patchState, signalStoreFeature, withComputed, withMethods, withState } from '@ngrx/signals';
import { ArkErrors } from 'arktype';
import { Operation } from 'rfc6902';
import { Subscription } from 'rxjs';
import { GameConnectionService } from './game-connection.service';
import { actions, GameState, gameState, MemberState, StateDelta, touchesGame } from './game-state.model';

interface PendingAction {
  id: string;
  committedVersion: number | null;
}
type ConfirmedState<TView> = Omit<GameState, 'game'> & { game: TView };
interface GameSessionState<TView> {
  status: 'loading' | 'empty' | 'ready';
  viewModel: TView | null;
  _confirmedState: ConfirmedState<TView> | null;
  _offeredActions: Record<string, Operation[]>;
  _pendingAction: PendingAction | null;
}

export function withGameSession<TView>(viewSchema: (data: unknown) => TView | ArkErrors) {
  const validateView = (view: unknown): TView => {
    const validated = viewSchema(view);
    if (validated instanceof ArkErrors) {
      console.error('Invalid game view', validated.summary);
      return validated.throw();
    }
    return validated;
  };
  const validateState = (state: unknown): ConfirmedState<TView> => {
    const validated = gameState.assert(state);
    return { ...validated, game: validateView(validated.game) };
  };
  const preview = (state: ConfirmedState<TView>, patch: Operation[]): TView => {
    actions.assert({ prediction: patch });
    return validateState(applyJsonPatch(state, patch)).game;
  };

  return signalStoreFeature(
    withState<GameSessionState<TView>>({ status: 'loading', viewModel: null, _confirmedState: null, _offeredActions: {}, _pendingAction: null }),
    withComputed(store => ({
      availableActions: computed(() => (store._pendingAction() === null ? Object.keys(store._offeredActions()) : [])),
      holdsActions: computed(() => Object.keys(store._offeredActions()).length > 0),
      engine: computed(() => store._confirmedState()?.engine ?? null),
      confirmedGame: computed(() => store._confirmedState()?.game ?? null),
      inviteCode: computed(() => store._confirmedState()?.engine.inviteCode ?? null),
    })),
    withMethods(store => {
      const connection = inject(GameConnectionService);
      let eventsSubscription: Subscription | undefined;
      let executeSubscription: Subscription | undefined;
      let commandId = 0;

      const cancelCommand = (): void => {
        commandId++;
        executeSubscription?.unsubscribe();
        executeSubscription = undefined;
      };
      const drop = (): void => {
        cancelCommand();
        patchState(store, { _pendingAction: null, viewModel: store._confirmedState()?.game ?? null });
      };
      const reconcile = (state: ConfirmedState<TView>, offered: Record<string, Operation[]>, pending: PendingAction | null) => {
        if (pending === null) return { view: state.game, pending: null };
        const acknowledged = pending.committedVersion !== null && state.engine.gameVersion >= pending.committedVersion;
        const patch = offered[pending.id];
        if (acknowledged || patch === undefined) return { view: state.game, pending: null };
        try {
          return { view: preview(state, patch), pending };
        } catch {
          return { view: state.game, pending: null };
        }
      };
      const reset = (snapshot: MemberState | null): void => {
        const state = snapshot === null ? null : validateState(snapshot.state);
        const offered = snapshot === null ? {} : actions.assert(snapshot.actions);
        cancelCommand();
        patchState(store, {
          status: state === null ? 'empty' : 'ready',
          viewModel: state?.game ?? null,
          _confirmedState: state,
          _offeredActions: offered,
          _pendingAction: null,
        });
      };
      const apply = (change: StateDelta): void => {
        const previous = store._confirmedState();
        if (previous === null) throw new Error('Cannot apply a change before the envelope is loaded');
        const candidate = validateState(applyJsonPatch(previous, change.patch));
        const gameChanged = change.gameVersion !== change.sourceGameVersion;
        if (
          candidate.syncId !== change.syncId ||
          candidate.syncId !== previous.syncId ||
          candidate.version !== change.version ||
          candidate.version !== previous.version + 1 ||
          previous.engine.gameVersion !== change.sourceGameVersion ||
          candidate.engine.gameVersion !== change.gameVersion ||
          change.gameVersion !== previous.engine.gameVersion + (gameChanged ? 1 : 0) ||
          (gameChanged && change.actions === null) ||
          (!gameChanged && (change.actions !== null || change.isRestore || touchesGame(change.patch)))
        )
          throw new Error('State change does not match the confirmed envelope');
        const offered = change.actions === null ? store._offeredActions() : actions.assert(change.actions);
        const display = reconcile(candidate, offered, change.isRestore ? null : store._pendingAction());
        if (display.pending === null && store._pendingAction() !== null) cancelCommand();
        patchState(store, { _confirmedState: candidate, _offeredActions: offered, _pendingAction: display.pending, viewModel: display.view });
      };
      return {
        connect(gameId: string): void {
          eventsSubscription?.unsubscribe();
          cancelCommand();
          eventsSubscription = connection.memberStateEvents.subscribe(event => {
            try {
              if (event.kind === 'reset') reset(event.state);
              else apply(event.change);
            } catch (error) {
              connection.synchronize();
              throw error;
            }
          });
          connection.connect(gameId, validateView);
        },
        disconnect(): void {
          eventsSubscription?.unsubscribe();
          eventsSubscription = undefined;
          connection.disconnect();
          drop();
        },
        choose(actionId: string): void {
          if (store._pendingAction() !== null) throw new Error('Cannot choose an action while another is pending');
          const state = store._confirmedState();
          const patch = store._offeredActions()[actionId];
          if (state === null || patch === undefined) throw new Error(`Action ${actionId} is not available`);
          const optimistic = preview(state, patch);
          const id = ++commandId;
          patchState(store, { viewModel: optimistic, _pendingAction: { id: actionId, committedVersion: null } });
          executeSubscription = connection.execute(actionId).subscribe({
            next: version => {
              if (id !== commandId) return;
              const pending = store._pendingAction();
              const confirmed = store._confirmedState();
              if (version === null || pending === null || confirmed === null) {
                drop();
                return;
              }
              const display = reconcile(confirmed, store._offeredActions(), { ...pending, committedVersion: version });
              if (display.pending === null) cancelCommand();
              patchState(store, { viewModel: display.view, _pendingAction: display.pending });
              if (version > confirmed.engine.gameVersion) connection.synchronize();
            },
            error: (error: unknown) => {
              if (id !== commandId) return;
              drop();
              throw error;
            },
          });
        },
      };
    }),
  );
}
