import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { ScenarioNameComponent } from './scenario-name.component';

const meta: Meta<ScenarioNameComponent> = {
  component: ScenarioNameComponent,
  decorators: [
    componentWrapperDecorator((story) => `<div class='w-70'>${story}</div>`),
  ],
};

export default meta;
type Story = StoryObj<ScenarioNameComponent>;

export const Normal: Story = {
  args: {
    campaignId: 'notz',
    scenarioId: 'mm',
  },
};
