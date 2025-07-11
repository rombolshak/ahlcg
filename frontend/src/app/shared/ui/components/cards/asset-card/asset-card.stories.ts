import { Meta, StoryObj } from '@storybook/angular';
import { cardA } from '../../../../domain/test/entities/test-cards';
import { AssetCardComponent } from './asset-card.component';

const meta: Meta<AssetCardComponent> = {
  component: AssetCardComponent,
  args: {
    displayOptions: { cardSize: 'l', textSize: 's' },
  },
};

export default meta;
type Story = StoryObj<AssetCardComponent>;

export const AssetGuardian: Story = {
  args: {
    card: {
      ...cardA,
      class: 'guardian',
    },
  },
};

export const AssetSeeker: Story = {
  args: {
    card: {
      ...cardA,
      class: 'seeker',
    },
  },
};

export const AssetRogue: Story = {
  args: {
    card: {
      ...cardA,
      class: 'rogue',
    },
  },
};

export const AssetSurvivor: Story = {
  args: {
    card: {
      ...cardA,
      class: 'survivor',
    },
  },
};

export const AssetMystic: Story = {
  args: {
    card: {
      ...cardA,
      class: 'mystic',
    },
  },
};

export const AssetNeutral: Story = {
  args: {
    card: {
      ...cardA,
      class: 'neutral',
    },
  },
};
