import {
  componentWrapperDecorator,
  Meta,
  moduleMetadata,
  StoryObj,
} from '@storybook/angular';
import { LocationComponent } from './location.component';
import { testLocation } from '../../../../../shared/domain/test/entities/test-locations';
import { GameStateStore } from '../../../store/game-state.store';
import { testGameState } from '../../../../../shared/domain/test/test-game-state';
import {
  InvestigatorG,
  InvestigatorS,
} from '../../../../../shared/domain/test/entities/test-investigators';

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

    componentWrapperDecorator(
      (story) => `<div class='w-[44rem] relative'>${story}</div>`,
    ),
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
