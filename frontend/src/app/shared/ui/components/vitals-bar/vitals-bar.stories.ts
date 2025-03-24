import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { VitalsBarComponent } from './vitals-bar.component';
import { Orientation } from './orientation';

const meta: Meta<VitalsBarComponent> = {
  component: VitalsBarComponent,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<VitalsBarComponent>;

export const Horizontal: Story = {
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div style="height: 20px; width: 500px; margin: 3em;">${story}</div>`,
    ),
  ],
  args: {
    orientation: Orientation.Horizontal,
    asset: {
      health: 10,
      sanity: 7,
    },
    state: {
      damage: 4,
      horror: 2,
    },
  },
};

export const Vertical: Story = {
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div style="width: 20px; height: 500px; margin: 3em;">${story}</div>`,
    ),
  ],
  args: {
    orientation: Orientation.Vertical,
    asset: {
      health: 10,
      sanity: 6,
    },
    state: {
      damage: 4,
      horror: 2,
    },
  },
};
