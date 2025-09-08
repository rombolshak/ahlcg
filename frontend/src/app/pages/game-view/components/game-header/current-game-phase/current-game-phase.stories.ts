import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { CurrentGamePhaseComponent } from './current-game-phase.component';
import { InvestigatorSeeker } from './phase-colors.model';

const meta: Meta<CurrentGamePhaseComponent> = {
  component: CurrentGamePhaseComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='min-w-70 h-12 grid'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<CurrentGamePhaseComponent>;

export const Normal: Story = {
  args: {
    roundNumber: 3,
    gamePhase: 'mythos',
    actingEntityTitle: 'cards/01/119.title',
    colorSet: InvestigatorSeeker,
  },
};

export const WithoutActor: Story = {
  args: {
    roundNumber: 3,
    gamePhase: 'upkeep',
    colorSet: InvestigatorSeeker,
  },
};
