import { HttpErrorResponse } from '@angular/common/http';
import { DialogComponent } from '@core/dialog/dialog.component';
import { CreatedGame, GamesService } from '@features/games/games.service';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular-vite';
import { NEVER, Observable, throwError } from 'rxjs';
import { userEvent, waitFor, within } from 'storybook/test';
import { JOIN_GAME_DIALOG_OPTIONS, JoinGameComponent } from './join-game.component';

// `AuthService`/`Router` are not involved: the dialog only ever calls `GamesService.join` and emits
// a result — navigating on it is the host's job (`MainMenuComponent`), the same split
// `sign-in.stories.ts` and `account.stories.ts` document for their own dialogs.
const withJoin = (join: (code: string) => Observable<CreatedGame> = () => NEVER) => ({
  imports: [DialogComponent],
  providers: [{ provide: GamesService, useValue: { join } }],
});

const meta: Meta<JoinGameComponent> = {
  component: JoinGameComponent,
  parameters: {
    // The dialog is `position: fixed` and covers the canvas, so story padding would only mislead.
    layout: 'fullscreen',
  },
  // Projected into a real dialog, opened through the `isOpen` input rather than `showModal()` — the
  // same width the two real entry points pass. `DialogService` is not involved: it appends its own
  // host to `document.body`, outside the canvas the play functions and Chromatic look at.
  render: () => ({
    template: `
      <ah-dialog [isOpen]="true" size="${JOIN_GAME_DIALOG_OPTIONS.size}">
        <ah-join-game />
      </ah-dialog>`,
  }),
};

export default meta;
type Story = StoryObj<JoinGameComponent>;

export const Empty: Story = {
  decorators: [moduleMetadata(withJoin())],
};

export const Filled: Story = {
  decorators: [moduleMetadata(withJoin())],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByTestId('join-game-code'), 'ABCDEF');
  },
};

export const InvalidFormat: Story = {
  decorators: [moduleMetadata(withJoin())],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByTestId('join-game-code'), 'K7QO');
    await userEvent.tab();
  },
};

export const Rejected: Story = {
  decorators: [moduleMetadata(withJoin(() => throwError(() => new HttpErrorResponse({ status: 404 }))))],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByTestId('join-game-code'), 'ABCDEF');
    await userEvent.click(canvas.getByTestId('join-game-submit'));
    await waitFor(() => canvas.getByTestId('join-game-error'));
  },
};

export const TooManyAttempts: Story = {
  decorators: [moduleMetadata(withJoin(() => throwError(() => new HttpErrorResponse({ status: 429 }))))],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByTestId('join-game-code'), 'ABCDEF');
    await userEvent.click(canvas.getByTestId('join-game-submit'));
    await waitFor(() => canvas.getByTestId('join-game-error'));
  },
};
