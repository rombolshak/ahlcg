import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { InvestigatorTokensComponent } from './investigator-tokens.component';

const meta: Meta<InvestigatorTokensComponent> = {
  component: InvestigatorTokensComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='w-[12rem] text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<InvestigatorTokensComponent>;

export const Guardian: Story = {
  args: {
    faction: 'guardian',
    tokens: {
      clue: 2,
      resource: 3,
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
