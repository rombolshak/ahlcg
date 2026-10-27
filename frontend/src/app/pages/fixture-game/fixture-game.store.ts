import { withGameSession } from '@features/games/with-game-session';
import { signalStore } from '@ngrx/signals';
import { fixtureView } from './fixture-view.model';

export const FixtureGameStore = signalStore(withGameSession(fixtureView));
