import { cardA, cardAInfo } from '@domain/testing/entities/test-cards';
import { Meta, StoryObj } from '@storybook/angular-vite';
import { AssetCardComponent } from './asset-card.component';

const meta: Meta<AssetCardComponent> = {
  component: AssetCardComponent,
  args: {
    cardInfo: cardAInfo,
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
