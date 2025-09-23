import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { InvestigatorS } from 'shared/domain/test/entities/test-investigators';
import { InvestigatorComponent } from './investigator.component';

const meta: Meta<InvestigatorComponent> = {
  component: InvestigatorComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='w-[22rem] text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<InvestigatorComponent>;

export const Seeker: Story = {
  args: {
    investigator: InvestigatorS,
  },
};

export const Guardian: Story = {
  args: {
    investigator: {
      ...InvestigatorS,
      faction: 'guardian',
    },
  },
};

export const Rogue: Story = {
  args: {
    investigator: {
      ...InvestigatorS,
      faction: 'rogue',
    },
  },
};

export const Mystic: Story = {
  args: {
    investigator: {
      ...InvestigatorS,
      faction: 'mystic',
    },
  },
};

export const Survivor: Story = {
  args: {
    investigator: {
      ...InvestigatorS,
      faction: 'survivor',
    },
  },
};

export const Neutral: Story = {
  args: {
    investigator: {
      ...InvestigatorS,
      faction: 'neutral',
    },
  },
};
