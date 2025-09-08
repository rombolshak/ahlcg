import { Meta, moduleMetadata, StoryObj } from '@storybook/angular';
import { GameHeaderComponent } from './game-header.component';
import { GameStateStore } from '../../store/game-state.store';
import { testGameState } from '../../../../shared/domain/test/test-game-state';
import { signal } from '@angular/core';

const meta: Meta<GameHeaderComponent> = {
  component: GameHeaderComponent,
  decorators: [
    moduleMetadata({
      providers: [
        {
          provide: GameStateStore,
          useValue: { gameState: signal(testGameState) },
        },
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj<GameHeaderComponent>;

export const Normal: Story = {
  args: {},
};
