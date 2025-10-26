import { ActionAreaButtonsComponent } from '@pages/game-view/current-investigator-panel/actions-area/action-area-buttons/action-area-buttons.component';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';

const meta: Meta<ActionAreaButtonsComponent> = {
  component: ActionAreaButtonsComponent,
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div class='w-[20rem] mt-10 ml-10 flex flex-col text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<ActionAreaButtonsComponent>;

export const Simple: Story = {};
