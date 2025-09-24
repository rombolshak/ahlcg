import { Meta, StoryObj } from '@storybook/angular';
import { cardS } from '../../../../domain/test/entities/test-cards';
import { SkillCardComponent } from './skill-card.component';

const meta: Meta<SkillCardComponent> = {
  component: SkillCardComponent,
  args: {
    displayOptions: { cardSize: 'l', textSize: 's' },
  },
};

export default meta;
type Story = StoryObj<SkillCardComponent>;

export const SkillGuardian: Story = {
  args: {
    card: {
      ...cardS,
      faction: 'guardian',
    },
  },
};

export const SkillSeeker: Story = {
  args: {
    card: {
      ...cardS,
      faction: 'seeker',
    },
  },
};

export const SkillRogue: Story = {
  args: {
    card: {
      ...cardS,
      faction: 'rogue',
    },
  },
};

export const SkillSurvivor: Story = {
  args: {
    card: {
      ...cardS,
      faction: 'survivor',
    },
  },
};

export const SkillMystic: Story = {
  args: {
    card: {
      ...cardS,
      faction: 'mystic',
    },
  },
};

export const SkillNeutral: Story = {
  args: {
    card: {
      ...cardS,
      faction: 'neutral',
    },
  },
};
