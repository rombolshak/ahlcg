import { AuthService, User } from '@services/auth.service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { DialogService } from '@services/dialog.service';
import { DialogComponent } from '@shared/components/dialog/dialog.component';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular-vite';
import { NEVER, of } from 'rxjs';
import { AccountComponent } from './account.component';

const withUser = (user: User | undefined) =>
  moduleMetadata({
    providers: [
      {
        provide: AuthService,
        useValue: { currentUser: of(user) },
      },
    ],
  });

const meta: Meta<AccountComponent> = {
  component: AccountComponent,
  decorators: [
    moduleMetadata({
      imports: [DialogComponent],
      providers: [
        // Requests never resolve — the stories only exercise the three static states, not a real
        // sign-out or upgrade.
        { provide: DialogService, useValue: { open: () => NEVER } },
        { provide: ConfirmDialogService, useValue: { confirm: () => NEVER } },
      ],
    }),
  ],
  parameters: {
    // The dialog is `position: fixed` and covers the canvas, so story padding would only mislead —
    // this view renders inside the settings dialog's own `size="s"` box, as it does in the app.
    layout: 'fullscreen',
  },
  // The heading is the dialog's, not this component's: `SettingsComponent` renames the dialog when
  // it switches to this view, so the story hardcodes the name that swap produces.
  render: () => ({
    template: `
      <ah-dialog [isOpen]="true" title="Your Account" size="s">
        <ah-account />
      </ah-dialog>`,
  }),
};

export default meta;
type Story = StoryObj<AccountComponent>;

export const Anonymous: Story = {
  decorators: [withUser({ isAnonymous: true, email: null, userName: '4139f1ea-4901-4253-a391-021faa001677' })],
};

export const Permanent: Story = {
  decorators: [withUser({ isAnonymous: false, email: 'a@example.com', userName: 'Alice' })],
};

export const SignedOut: Story = {
  decorators: [withUser(undefined)],
};
