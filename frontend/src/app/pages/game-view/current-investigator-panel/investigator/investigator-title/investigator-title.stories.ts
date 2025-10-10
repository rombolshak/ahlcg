import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { InvestigatorTitleComponent } from './investigator-title.component';

const meta: Meta<InvestigatorTitleComponent> = {
  component: InvestigatorTitleComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='flex w-[12rem] text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<InvestigatorTitleComponent>;

export const Guardian: Story = {
  args: {
    text: 'Roland Banks',
    faction: 'guardian',
  },
};

export const Seeker: Story = {
  args: {
    text: 'Daisy Walker',
    faction: 'seeker',
  },
};

export const Rogue: Story = {
  args: {
    text: '"Skids" O\'Toole',
    faction: 'rogue',
  },
};

export const Mystic: Story = {
  args: {
    text: 'Agnes Baker',
    faction: 'mystic',
  },
};

export const Survivor: Story = {
  args: {
    text: 'Wendy Adams',
    faction: 'survivor',
  },
};

export const Neutral: Story = {
  args: {
    text: 'Lola Hayes',
    faction: 'neutral',
  },
};
