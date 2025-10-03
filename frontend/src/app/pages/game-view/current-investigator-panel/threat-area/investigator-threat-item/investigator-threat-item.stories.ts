import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { testEnemy2 } from 'shared/domain/test/entities/test-enemies';
import { InvestigatorThreatItemComponent } from './investigator-threat-item.component';

const meta: Meta<InvestigatorThreatItemComponent> = {
  component: InvestigatorThreatItemComponent,
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div class='w-[17rem] min-h-40 text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<InvestigatorThreatItemComponent>;

export const Simple: Story = {
  args: {
    enemy: testEnemy2,
  },
};
