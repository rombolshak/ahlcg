import { testEnemy2 } from '@domain/test/entities/test-enemies';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular-vite';
import { InvestigatorThreatItemComponent } from './investigator-threat-item.component';

const meta: Meta<InvestigatorThreatItemComponent> = {
  component: InvestigatorThreatItemComponent,
  decorators: [componentWrapperDecorator(story => `<div class='w-[17rem] min-h-40 text-neutral-900'>${story}</div>`)],
};

export default meta;
type Story = StoryObj<InvestigatorThreatItemComponent>;

export const Simple: Story = {
  args: {
    enemy: testEnemy2,
  },
};
