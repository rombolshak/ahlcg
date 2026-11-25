import { withGameSession } from '@features/games/session/with-game-session';
import { signalStore } from '@ngrx/signals';
import { fixtureView } from './fixture-view.model';

export const FixtureGameStore = signalStore(withGameSession(fixtureView));
