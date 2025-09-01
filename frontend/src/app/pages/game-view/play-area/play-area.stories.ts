import { PlayAreaComponent } from './play-area.component';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';
import { GameStateStore } from '../store/game-state.store';
import { testGameState } from 'shared/domain/test/test-game-state';

const meta: Meta<PlayAreaComponent> = {
  component: PlayAreaComponent,
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
  ],
};

export default meta;
type Story = StoryObj<PlayAreaComponent>;

export const Example: Story = {};
