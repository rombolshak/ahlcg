import { signalStore, withState } from '@ngrx/signals';
import { GameState } from 'shared/domain/game-state';
import { withEntities } from '@ngrx/signals/entities';
import { Act } from 'shared/domain/entities/act.model';
import { Enemy } from 'shared/domain/entities/enemy.model';
import { Investigator } from 'shared/domain/entities/investigator.model';

interface State {
  isLoading: boolean;
  error: string | null;
  value: GameState | null;
}

export const GameStateStore = signalStore(
  { providedIn: 'root' },
  withState<State>({ isLoading: true, error: null, value: null }),
);

export const ActsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Act>(),
);

export const EnemiesStore = signalStore(
  { providedIn: 'root' },
  withEntities<Enemy>(),
);

export const InvestigatorsStore = signalStore(
  { providedIn: 'root' },
  withEntities<Investigator>(),
);
