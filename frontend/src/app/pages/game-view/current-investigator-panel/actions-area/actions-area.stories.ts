import { testActions } from '@domain/test/test-actions';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { ActionsAreaComponent } from './actions-area.component';

const meta: Meta<ActionsAreaComponent> = {
  component: ActionsAreaComponent,
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div class='w-[20rem] ml-10 mt-10 flex flex-col text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<ActionsAreaComponent>;

export const Simple: Story = {
  args: {
    actions: testActions,
  },
};
