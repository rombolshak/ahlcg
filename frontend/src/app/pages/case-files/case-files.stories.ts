import { Router } from '@angular/router';
import { AuthService, User } from '@core/auth/auth.service';
import { GamesService, GameSummary } from '@features/games/games.service';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular-vite';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { userEvent, within } from 'storybook/test';
import { CaseFilesComponent } from './case-files.component';

const user: User = { isAnonymous: true, email: null, userName: 'anon-guid' };

const dayInMs = 24 * 60 * 60 * 1000;

// Fixed rather than `Date.now()`-derived: Chromatic snapshots have to be identical run to run, and
// a relative date would drift the rendered text on every build.
const referenceInstant = new Date('2026-09-12T18:40:00Z').getTime();

const game = (id: string, daysAgoPlayed: number, daysAgoCompleted?: number): GameSummary => ({
  id,
  createdAt: new Date(referenceInstant - (daysAgoPlayed + 5) * dayInMs),
  lastPlayedAt: new Date(referenceInstant - daysAgoPlayed * dayInMs),
  completedAt: daysAgoCompleted === undefined ? null : new Date(referenceInstant - daysAgoCompleted * dayInMs),
});

// `AuthService.currentUser` and `Router.navigate` never resolve real navigation or accounts — the
// stories only exercise the resource states, the same stub shape `sign-in.stories.ts` uses.
const withGames = (recent: () => Observable<GameSummary[]>, archive: () => Observable<GameSummary[]> = () => of([])) => ({
  providers: [
    { provide: AuthService, useValue: { currentUser: of(user) } },
    { provide: GamesService, useValue: { recent, archive } },
    { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
  ],
});

const meta: Meta<CaseFilesComponent> = {
  component: CaseFilesComponent,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<CaseFilesComponent>;

export const SingleEntry: Story = {
  decorators: [moduleMetadata(withGames(() => of([game('game-1', 0)])))],
};

export const ShortList: Story = {
  decorators: [moduleMetadata(withGames(() => of([game('game-1', 0), game('game-2', 1), game('game-3', 2), game('game-4', 3)])))],
};

export const LongList: Story = {
  decorators: [moduleMetadata(withGames(() => of(Array.from({ length: 12 }, (_, index) => game(`game-${String(index + 1)}`, index)))))],
};

export const RecentMixed: Story = {
  decorators: [moduleMetadata(withGames(() => of([game('game-1', 0), game('game-2', 1), game('game-3', 5, 1), game('game-4', 6, 2)])))],
};

export const Empty: Story = {
  decorators: [moduleMetadata(withGames(() => of([])))],
};

// Chromatic pauses a CSS animation at the end of its cycle, and `skeleton` is infinite — it has no
// end, so the captured frame is arbitrary. `false` pins it to the first frame instead.
export const Loading: Story = {
  parameters: {
    chromatic: { pauseAnimationAtEnd: false },
  },
  decorators: [moduleMetadata(withGames(() => NEVER))],
};

// Not named `Error` — it would shadow the global `Error` constructor for the rest of this module,
// and the `throwError(() => new Error(...))` factory needs the real one.
export const Failure: Story = {
  decorators: [moduleMetadata(withGames(() => throwError(() => new Error('boom'))))],
};

export const Archive: Story = {
  decorators: [
    moduleMetadata(
      withGames(
        () => of([game('game-1', 0)]),
        () => of([game('game-2', 5, 1), game('game-3', 6, 2)]),
      ),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('tab-archive'));
  },
};

export const ArchiveEmpty: Story = {
  decorators: [
    moduleMetadata(
      withGames(
        () => of([game('game-1', 0)]),
        () => of([]),
      ),
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('tab-archive'));
  },
};
