import { componentWrapperDecorator, Meta, moduleMetadata, StoryObj } from '@storybook/angular-vite';
import { InvestigatorG, InvestigatorS } from '@testing/entities/test-investigators';
import { testLocation } from '@testing/entities/test-locations';
import { testGameState } from '@testing/test-game-state';
import { GameStateStore } from '../../store/game-state.store';
import { LocationComponent } from './location.component';

const meta: Meta<LocationComponent> = {
  component: LocationComponent,
  decorators: [
    moduleMetadata({
      providers: [
        {
          provide: GameStateStore,
          useFactory: () => {
            const store = new GameStateStore();
            store.setState(testGameState);
            return store;
          },
        },
      ],
    }),

    componentWrapperDecorator(story => `<div class='w-[44rem] relative'>${story}</div>`),
  ],
};

export default meta;
type Story = StoryObj<LocationComponent>;

export const Empty: Story = {
  args: {
    locationId: testLocation.id,
    investigatorsIds: [],
  },
};

export const WithInvestigator: Story = {
  args: {
    locationId: testLocation.id,
    investigatorsIds: [InvestigatorS.id],
  },
};

export const WithEngagedInvestigator: Story = {
  args: {
    locationId: testLocation.id,
    investigatorsIds: [InvestigatorG.id],
  },
};

export const WithSeveralInvestigators: Story = {
  args: {
    locationId: testLocation.id,
    investigatorsIds: [InvestigatorS.id, InvestigatorG.id],
  },
};
