import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { SingleBarComponent } from './single-bar.component';
import { Orientation } from '../orientation';

const meta: Meta<SingleBarComponent> = {
  component: SingleBarComponent,
  argTypes: {
    orientation: {
      options: [Orientation.Horizontal, Orientation.Vertical],
    },
  },
};

export default meta;
type Story = StoryObj<SingleBarComponent>;

export const Horizontal: Story = {
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div style="height: 10px; width: 200px; margin: 3em;">${story}</div>`,
    ),
  ],
  args: {
    orientation: Orientation.Horizontal,
    max: 10,
    current: 4,
    badColor: 'bg-red-700',
    goodColor: 'bg-red-300',
  },
};

export const Vertical: Story = {
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div style="width: 10px; height: 200px; margin: 3em;">${story}</div>`,
    ),
  ],
  args: {
    orientation: Orientation.Vertical,
    max: 10,
    current: 4,
    badColor: 'bg-red-700',
    goodColor: 'bg-red-300',
  },
};
