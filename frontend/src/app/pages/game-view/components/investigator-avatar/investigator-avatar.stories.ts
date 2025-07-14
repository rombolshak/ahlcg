import { Meta, StoryObj } from '@storybook/angular';
import { InvestigatorAvatarComponent } from './investigator-avatar.component';
import { InvestigatorG } from '../../../../shared/domain/test/entities/test-investigators';

const meta: Meta<InvestigatorAvatarComponent> = {
  component: InvestigatorAvatarComponent,
  decorators: [],
};

export default meta;
type Story = StoryObj<InvestigatorAvatarComponent>;

export const Normal: Story = {
  args: {
    investigator: InvestigatorG,
  },
};
