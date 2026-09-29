import { HttpErrorResponse } from '@angular/common/http';
import { DialogComponent } from '@core/dialog/dialog.component';
import { CreatedGame, GamesService } from '@features/games/games.service';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular-vite';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { userEvent, waitFor, within } from 'storybook/test';
import { GRANTED_REDIRECT_DELAY, JOIN_GAME_DIALOG_OPTIONS, JoinGameComponent } from './join-game.component';

const withJoin = (join: (code: string) => Observable<CreatedGame> = () => NEVER, redirectDelay?: number) => ({
  imports: [DialogComponent],
  providers: [
    { provide: GamesService, useValue: { join } },
    ...(redirectDelay === undefined ? [] : [{ provide: GRANTED_REDIRECT_DELAY, useValue: redirectDelay }]),
  ],
});

const meta: Meta<JoinGameComponent> = {
  component: JoinGameComponent,
  parameters: {
    layout: 'fullscreen',
    // The spinner, caret pulse and drain bar never reach a stable end; pin them to their first frame.
    chromatic: { pauseAnimationAtEnd: false },
  },
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

export const Typing: Story = {
  decorators: [moduleMetadata(withJoin())],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByTestId('join-game-code'), 'ABC');
  },
};

export const Submitting: Story = {
  decorators: [moduleMetadata(withJoin())],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByTestId('join-game-code'), 'ABCDEF');
    await userEvent.click(canvas.getByTestId('join-game-submit'));
  },
};

export const Generic: Story = {
  decorators: [moduleMetadata(withJoin(() => throwError(() => new HttpErrorResponse({ status: 500 }))))],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByTestId('join-game-code'), 'ABCDEF');
    await userEvent.click(canvas.getByTestId('join-game-submit'));
    await waitFor(() => canvas.getByTestId('join-game-error'));
  },
};

export const AccessGranted: Story = {
  decorators: [moduleMetadata(withJoin(() => of({ id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' }), 3_600_000))],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByTestId('join-game-code'), 'ABCDEF');
    await userEvent.click(canvas.getByTestId('join-game-submit'));
    await waitFor(() => canvas.getByTestId('join-game-granted'));
  },
};
