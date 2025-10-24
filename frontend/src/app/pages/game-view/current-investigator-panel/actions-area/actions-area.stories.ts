import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { ActionsAreaComponent } from './actions-area.component';

const meta: Meta<ActionsAreaComponent> = {
  component: ActionsAreaComponent,
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div class='w-[20rem] flex flex-col text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<ActionsAreaComponent>;

export const Simple: Story = {};
