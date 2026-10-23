import { applyJsonPatch } from '@core/apply-json-patch';
import { MemberState, StateChange } from '@features/games/game-connection.service';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { ArkErrors } from 'arktype';
import { fixtureView, FixtureView } from './fixture-view.model';

interface State {
  status: 'loading' | 'empty' | 'ready';
  version: number | null;
  view: FixtureView | null;
}

function validateView(view: unknown): FixtureView {
  const validated = fixtureView(view);
  if (validated instanceof ArkErrors) {
    console.error('Invalid fixture view', validated.summary);
    return validated.throw();
  }

  return validated;
}

export const FixtureGameStore = signalStore(
  withState<State>({ status: 'loading', version: null, view: null }),
  withMethods(store => ({
    reset(state: MemberState | null): void {
      if (state === null) {
        patchState(store, { status: 'empty', version: null, view: null });
        return;
      }

      patchState(store, { status: 'ready', version: state.version, view: validateView(state.view) });
    },
    apply(change: StateChange): void {
      const current = store.view();
      if (current === null) throw new Error('Cannot apply a change before the view is loaded');

      const view = validateView(applyJsonPatch(current, change.viewPatch));
      patchState(store, { version: change.version, view });
    },
  })),
);
