import { Meta, StoryObj } from '@storybook/angular';
import { cardS } from '../../../../domain/test/entities/test-cards';
import { SkillCardComponent } from '../skill-card/skill-card.component';

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
      class: 'guardian',
    },
  },
};

export const SkillSeeker: Story = {
  args: {
    card: {
      ...cardS,
      class: 'seeker',
    },
  },
};

export const SkillRogue: Story = {
  args: {
    card: {
      ...cardS,
      class: 'rogue',
    },
  },
};

export const SkillSurvivor: Story = {
  args: {
    card: {
      ...cardS,
      class: 'survivor',
    },
  },
};

export const SkillMystic: Story = {
  args: {
    card: {
      ...cardS,
      class: 'mystic',
    },
  },
};

export const SkillNeutral: Story = {
  args: {
    card: {
      ...cardS,
      class: 'neutral',
    },
  },
};
