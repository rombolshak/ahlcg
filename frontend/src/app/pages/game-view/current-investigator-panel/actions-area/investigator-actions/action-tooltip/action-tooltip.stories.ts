import { cardA3 } from '@domain/test/entities/test-cards';
import { testLocation } from '@domain/test/entities/test-locations';
import { ActionTooltipComponent } from '@pages/game-view/current-investigator-panel/actions-area/investigator-actions/action-tooltip/action-tooltip.component';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';

const meta: Meta<ActionTooltipComponent> = {
  component: ActionTooltipComponent,
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div class='w-[20rem] mt-10 ml-10 flex flex-col'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<ActionTooltipComponent>;

export const Standard: Story = {
  args: {
    action: {
      id: 1,
    },
  },
};

export const Restrictions: Story = {
  args: {
    action: {
      id: 1,
      originator: cardA3.id,
      restrictions: 'evade_only',
    },
  },
};

export const Spent: Story = {
  args: {
    action: {
      id: 1,
      spentOn: {
        actionType: 'investigate',
        target: testLocation.id,
      },
    },
  },
};
