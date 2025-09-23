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
      faction: 'guardian',
    },
  },
};

export const AssetSeeker: Story = {
  args: {
    card: {
      ...cardA,
      faction: 'seeker',
    },
  },
};

export const AssetRogue: Story = {
  args: {
    card: {
      ...cardA,
      faction: 'rogue',
    },
  },
};

export const AssetSurvivor: Story = {
  args: {
    card: {
      ...cardA,
      faction: 'survivor',
    },
  },
};

export const AssetMystic: Story = {
  args: {
    card: {
      ...cardA,
      faction: 'mystic',
    },
  },
};

export const AssetNeutral: Story = {
  args: {
    card: {
      ...cardA,
      faction: 'neutral',
    },
  },
};
