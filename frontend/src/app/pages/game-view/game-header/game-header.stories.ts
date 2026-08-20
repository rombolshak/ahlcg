import { signal } from '@angular/core';
import { testGameState } from '@domain/testing/test-game-state';
import { Meta, moduleMetadata, StoryObj } from '@storybook/angular-vite';
import { GameStateStore } from '../store/game-state.store';
import { GameHeaderComponent } from './game-header.component';

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
