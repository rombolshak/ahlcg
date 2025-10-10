import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { InvestigatorAbilityComponent } from './investigator-ability.component';

const meta: Meta<InvestigatorAbilityComponent> = {
  component: InvestigatorAbilityComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='flex w-[12rem] text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<InvestigatorAbilityComponent>;

export const Guardian: Story = {
  args: {
    text: 'You may take as many actions as you want as long as you have 0 resources, 0 clues and 0 assets in the control area.',
    faction: 'guardian',
  },
};

export const Seeker: Story = {
  args: {
    text: 'You may take as many actions as you want as long as you have 0 resources, 0 clues and 0 assets in the control area.',
    faction: 'seeker',
  },
};

export const Rogue: Story = {
  args: {
    text: 'You may take as many actions as you want as long as you have 0 resources, 0 clues and 0 assets in the control area.',
    faction: 'rogue',
  },
};

export const Mystic: Story = {
  args: {
    text: 'You may take as many actions as you want as long as you have 0 resources, 0 clues and 0 assets in the control area.',
    faction: 'mystic',
  },
};

export const Survivor: Story = {
  args: {
    text: 'You may take as many actions as you want as long as you have 0 resources, 0 clues and 0 assets in the control area.',
    faction: 'survivor',
  },
};

export const Neutral: Story = {
  args: {
    text: 'You may take as many actions as you want as long as you have 0 resources, 0 clues and 0 assets in the control area.',
    faction: 'neutral',
  },
};
