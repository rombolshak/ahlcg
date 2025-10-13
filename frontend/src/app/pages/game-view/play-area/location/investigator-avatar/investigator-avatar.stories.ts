import {
  InvestigatorG,
  InvestigatorS,
} from '@domain/test/entities/test-investigators';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { InvestigatorAvatarComponent } from './investigator-avatar.component';

const meta: Meta<InvestigatorAvatarComponent> = {
  component: InvestigatorAvatarComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='max-w-40'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<InvestigatorAvatarComponent>;

export const Normal: Story = {
  args: {
    investigator: InvestigatorS,
  },
};

export const WithTokens: Story = {
  args: {
    investigator: InvestigatorG,
  },
};
