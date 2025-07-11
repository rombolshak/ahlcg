import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { cardA } from '../../../../../../shared/domain/test/entities/test-cards';
import { AssetPopoverComponent } from './asset-popover.component';

const meta: Meta<AssetPopoverComponent> = {
  component: AssetPopoverComponent,
  decorators: [
    componentWrapperDecorator((story) => `<div class="w-60">${story}</div>`),
  ],
};

export default meta;
type Story = StoryObj<AssetPopoverComponent>;

export const Guardian: Story = {
  args: {
    asset: {
      ...cardA,
      class: 'guardian',
    },
  },
};

export const Seeker: Story = {
  args: {
    asset: {
      ...cardA,
      class: 'seeker',
    },
  },
};

export const Rogue: Story = {
  args: {
    asset: {
      ...cardA,
      class: 'rogue',
    },
  },
};

export const Survivor: Story = {
  args: {
    asset: {
      ...cardA,
      class: 'survivor',
    },
  },
};

export const Mystic: Story = {
  args: {
    asset: {
      ...cardA,
      class: 'mystic',
    },
  },
};

export const Neutral: Story = {
  args: {
    asset: {
      ...cardA,
      class: 'neutral',
    },
  },
};
