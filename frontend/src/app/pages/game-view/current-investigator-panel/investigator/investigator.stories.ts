import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { InvestigatorS } from 'shared/domain/test/entities/test-investigators';
import { InvestigatorComponent } from './investigator.component';

const meta: Meta<InvestigatorComponent> = {
  component: InvestigatorComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='w-[17rem] text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<InvestigatorComponent>;

export const Normal: Story = {
  args: {
    investigator: InvestigatorS,
  },
};
