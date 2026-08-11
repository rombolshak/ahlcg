import { AuthService } from '@services/auth.service';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';
import { NEVER } from 'rxjs';
import { userEvent, within } from 'storybook/test';
import { SignInComponent } from './sign-in.component';

const meta: Meta<SignInComponent> = {
  component: SignInComponent,
  decorators: [
    moduleMetadata({
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
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<SignInComponent>;

export const Choice: Story = {
  args: {},
};

export const Credentials: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByTestId('credentials'));
  },
};
