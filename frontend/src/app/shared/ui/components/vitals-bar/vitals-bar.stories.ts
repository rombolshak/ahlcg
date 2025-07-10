import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { VitalsBarComponent } from './vitals-bar.component';

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
        `<div style="height: 20px; width: 500px; margin: 3em; display: flex; flex-direction: row">${story}</div>`,
    ),
  ],
  args: {
    orientation: 'horizontal',
    entity: {
      health: {
        max: 10,
        damaged: 4,
      },
      sanity: {
        max: 7,
        damaged: 2,
      },
    },
  },
};

export const Vertical: Story = {
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div style="width: 20px; height: 500px; margin: 3em; display: flex">${story}</div>`,
    ),
  ],
  args: {
    orientation: 'vertical',
    entity: {
      health: {
        max: 10,
        damaged: 4,
      },
      sanity: {
        max: 7,
        damaged: 2,
      },
    },
  },
};
