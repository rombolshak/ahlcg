import { Meta, StoryObj } from '@storybook/angular';
import { InvestigatorG } from '../../../../shared/domain/test/entities/test-investigators';
import { InvestigatorAvatarComponent } from './investigator-avatar.component';

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

export const WithoutVitals: Story = {
  args: {
    ...Normal.args,
    withoutVitals: true,
  },
};
