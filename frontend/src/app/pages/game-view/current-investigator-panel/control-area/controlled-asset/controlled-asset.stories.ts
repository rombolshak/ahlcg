import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { cardA } from '../../../../../shared/domain/test/entities/test-cards';
import { ControlledAssetComponent } from './controlled-asset.component';

const meta: Meta<ControlledAssetComponent> = {
  component: ControlledAssetComponent,
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div class="w-[6rem] h-[4.5rem] mr-3 mb-3 rounded-lg outline-primary outline-2">${story}</div>`,
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
        resource: 1,
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

export const Hovered: Story = {
  args: {
    ...Simple.args,
    hovered: true,
  },
};
