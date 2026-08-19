import { AuthService } from '@core/auth/auth.service';
import { DialogComponent } from '@core/dialog/dialog.component';
import { TranslocoDirective } from '@jsverse/transloco';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular-vite';
import { NEVER } from 'rxjs';
import { userEvent, within } from 'storybook/test';
import { SIGN_IN_DIALOG_OPTIONS, SignInComponent } from './sign-in.component';

const meta: Meta<SignInComponent> = {
  component: SignInComponent,
  decorators: [
    moduleMetadata({
      imports: [DialogComponent, TranslocoDirective],
      providers: [
        {
          // Requests never resolve — the stories only exercise the two static views, not a real sign-in.
          provide: AuthService,
          useValue: {
            loginAnonymously: () => NEVER,
            signIn: () => NEVER,
          },
        },
      ],
    }),
  ],
  parameters: {
    // The dialog is `position: fixed` and covers the canvas, so story padding would only mislead.
    layout: 'fullscreen',
  },
  // Projected into a real dialog, opened through the `isOpen` input rather than `showModal()` —
  // the same width, padding and title the prompt gets in the app, from the options both entry
  // points pass. `DialogService` is not involved: it appends its own host to `document.body`,
  // outside the story canvas the play functions and Chromatic snapshots look at.
  render: () => ({
    template: `
      <ah-dialog *transloco="let t" [isOpen]="true" [title]="t('${SIGN_IN_DIALOG_OPTIONS.titleKey}')" size="${SIGN_IN_DIALOG_OPTIONS.size}">
        <ah-sign-in />
      </ah-dialog>`,
  }),
};

export default meta;
type Story = StoryObj<SignInComponent>;

export const Choice: Story = {};

export const Credentials: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('credentials'));
  },
};
