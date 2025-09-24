import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { InvestigatorSkillsComponent } from './investigator-skills.component';

const meta: Meta<InvestigatorSkillsComponent> = {
  component: InvestigatorSkillsComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='w-[6rem] text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<InvestigatorSkillsComponent>;

export const Guardian: Story = {
  args: {
    faction: 'guardian',
    skills: {
      combat: 1,
      intellect: 2,
      willpower: 3,
      agility: 4,
    },
  },
};

export const Seeker: Story = {
  args: {
    ...Guardian.args,
    faction: 'seeker',
  },
};

export const Rogue: Story = {
  args: {
    ...Guardian.args,
    faction: 'rogue',
  },
};

export const Mystic: Story = {
  args: {
    ...Guardian.args,
    faction: 'mystic',
  },
};

export const Survivor: Story = {
  args: {
    ...Guardian.args,
    faction: 'survivor',
  },
};

export const Neutral: Story = {
  args: {
    ...Guardian.args,
    faction: 'neutral',
  },
};
