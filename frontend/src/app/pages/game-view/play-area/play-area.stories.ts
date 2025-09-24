import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';
import { testGameState } from 'shared/domain/test/test-game-state';
import { GameStateStore } from '../store/game-state.store';
import { PlayAreaComponent } from './play-area.component';

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
