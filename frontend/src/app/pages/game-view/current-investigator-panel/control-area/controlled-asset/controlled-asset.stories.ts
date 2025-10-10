import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { cardA } from '../../../../../shared/domain/test/entities/test-cards';
import { ControlledAssetComponent } from './controlled-asset.component';

const meta: Meta<ControlledAssetComponent> = {
  component: ControlledAssetComponent,
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div class="ml-50 w-[5.5rem] rounded grid grid-cols-1 auto-rows-[5.5rem]">${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<ControlledAssetComponent>;

const { slot, ...pureAsset } = cardA;

export const Simple: Story = {
  args: {
    asset: pureAsset,
  },
};

export const WithSlot: Story = {
  args: {
    asset: {
      ...pureAsset,
      faction: 'mystic',
      slot: slot ?? 'hand',
    },
  },
};

export const WithResource: Story = {
  args: {
    asset: {
      ...pureAsset,
      faction: 'mystic',
      hasAction: true,
      tokens: {
        resource: 3,
      },
    },
  },
};

export const WithClue: Story = {
  args: {
    asset: {
      ...pureAsset,
      tokens: {
        clue: 2,
      },
    },
  },
};

export const WithDoom: Story = {
  args: {
    asset: {
      ...pureAsset,
      faction: 'mystic',
      tokens: {
        doom: 1,
      },
    },
  },
};

export const SeveralIcons: Story = {
  args: {
    asset: {
      ...pureAsset,
      slot: slot ?? 'hand',
      additionalSlot: 'arcane',
      tokens: {
        resource: 3,
        clue: 2,
      },
    },
  },
};

export const WithHealth: Story = {
  args: {
    asset: {
      ...pureAsset,
      health: {
        max: 3,
        damaged: 1,
      },
    },
  },
};

export const WithHealthAndSanity: Story = {
  args: {
    asset: {
      ...pureAsset,
      health: {
        max: 3,
        damaged: 1,
      },
      sanity: {
        max: 1,
        damaged: 0,
      },
      slot: 'ally',
    },
  },
};

export const Hovered: Story = {
  args: {
    ...Simple.args,
    hovered: true,
  },
};

export const Passive: Story = {
  args: {
    ...SeveralIcons.args,
    passive: true,
  },
};
