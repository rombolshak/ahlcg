import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { InvestigatorSubtitleComponent } from './investigator-subtitle.component';

const meta: Meta<InvestigatorSubtitleComponent> = {
  component: InvestigatorSubtitleComponent,
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div class='w-[12rem] text-neutral-900 flex flex-col'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<InvestigatorSubtitleComponent>;

export const Guardian: Story = {
  args: {
    text: 'The Fed',
    faction: 'guardian',
  },
};

export const Seeker: Story = {
  args: {
    text: 'The Librarian',
    faction: 'seeker',
  },
};

export const Rogue: Story = {
  args: {
    text: 'The Ex-Con',
    faction: 'rogue',
  },
};

export const Mystic: Story = {
  args: {
    text: 'The Waitress',
    faction: 'mystic',
  },
};

export const Survivor: Story = {
  args: {
    text: 'The Urchin',
    faction: 'survivor',
  },
};

export const Neutral: Story = {
  args: {
    text: 'The Actress',
    faction: 'neutral',
  },
};
