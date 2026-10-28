import { computed, inject } from '@angular/core';
import { applyJsonPatch } from '@core/apply-json-patch';
import { patchState, signalStoreFeature, withComputed, withMethods, withState } from '@ngrx/signals';
import { ArkErrors } from 'arktype';
import { Operation } from 'rfc6902';
import { Subscription } from 'rxjs';
import { GameConnectionService, MemberState, StateChange } from './game-connection.service';

interface PendingAction {
  id: string;
  committedVersion: number | null;
}

interface GameSessionState<TView> {
  status: 'loading' | 'empty' | 'ready';
  viewModel: TView | null;
  _confirmedVersion: number | null;
  _confirmedView: TView | null;
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

  return signalStoreFeature(
    withState<GameSessionState<TView>>({
      status: 'loading',
      viewModel: null,
      _confirmedVersion: null,
      _confirmedView: null,
      _offeredActions: {},
      _pendingAction: null,
    }),
    withComputed(store => {
      const connection = inject(GameConnectionService);
      return {
        availableActions: computed(() => (store._pendingAction() === null ? Object.keys(store._offeredActions()) : [])),
        holdsActions: computed(() => Object.keys(store._offeredActions()).length > 0),
        inviteCode: computed(() => connection.inviteCode()),
      };
    }),
    withMethods(store => {
      const connection = inject(GameConnectionService);
      let eventsSubscription: Subscription | undefined;
      let executeSubscription: Subscription | undefined;

      const drop = (): void => {
        executeSubscription?.unsubscribe();
        executeSubscription = undefined;
        patchState(store, { _pendingAction: null, viewModel: store._confirmedView() });
      };

      const reconcile = (): void => {
        const pending = store._pendingAction();
        const confirmedView = store._confirmedView();
        if (pending === null) {
          patchState(store, { viewModel: confirmedView });
          return;
        }

        const confirmedVersion = store._confirmedVersion();
        const acknowledged = pending.committedVersion !== null && confirmedVersion !== null && confirmedVersion >= pending.committedVersion;
        const patch = store._offeredActions()[pending.id];
        if (acknowledged || patch === undefined || confirmedView === null) {
          drop();
          return;
        }

        try {
          patchState(store, { viewModel: validateView(applyJsonPatch(confirmedView, patch)) });
        } catch {
          drop();
        }
      };

      const reset = (state: MemberState | null): void => {
        if (state === null) {
          executeSubscription?.unsubscribe();
          executeSubscription = undefined;
          patchState(store, {
            status: 'empty',
            viewModel: null,
            _confirmedVersion: null,
            _confirmedView: null,
            _offeredActions: {},
            _pendingAction: null,
          });
          return;
        }

        patchState(store, {
          status: 'ready',
          _confirmedVersion: state.version,
          _confirmedView: validateView(state.view),
          _offeredActions: state.actions,
        });
        reconcile();
      };

      const apply = (change: StateChange): void => {
        const current = store._confirmedView();
        if (current === null) throw new Error('Cannot apply a change before the view is loaded');

        const confirmedView = validateView(applyJsonPatch(current, change.viewPatch));
        patchState(store, { _confirmedVersion: change.version, _confirmedView: confirmedView, _offeredActions: change.actions });
        reconcile();
      };

      return {
        connect(gameId: string): void {
          eventsSubscription?.unsubscribe();
          eventsSubscription = connection.memberStateEvents.subscribe(event => {
            if (event.kind === 'reset') reset(event.state);
            else apply(event.change);
          });
          connection.connect(gameId);
        },
        disconnect(): void {
          eventsSubscription?.unsubscribe();
          eventsSubscription = undefined;
          connection.disconnect();
          drop();
        },
        choose(actionId: string): void {
          if (store._pendingAction() !== null) throw new Error('Cannot choose an action while another is pending');
          if (!store.availableActions().includes(actionId)) throw new Error(`Action ${actionId} is not available`);

          const confirmedView = store._confirmedView();
          const patch = store._offeredActions()[actionId];
          if (confirmedView === null || patch === undefined) throw new Error(`Action ${actionId} is not available`);

          patchState(store, {
            viewModel: validateView(applyJsonPatch(confirmedView, patch)),
            _pendingAction: { id: actionId, committedVersion: null },
          });

          executeSubscription = connection.execute(actionId).subscribe({
            next: version => {
              const pending = store._pendingAction();
              if (version === null || pending === null) {
                drop();
                return;
              }

              patchState(store, { _pendingAction: { ...pending, committedVersion: version } });
              reconcile();
            },
            error: (error: unknown) => {
              drop();
              throw error;
            },
          });
        },
      };
    }),
  );
}
