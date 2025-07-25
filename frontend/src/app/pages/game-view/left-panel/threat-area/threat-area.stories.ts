﻿import { ThreatAreaComponent } from './threat-area.component';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import {
  testEnemy,
  testEnemy2,
  testMassiveEnemy,
} from '../../../../shared/domain/test/entities/test-enemies';

const meta: Meta<ThreatAreaComponent> = {
  component: ThreatAreaComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='w-[17rem] min-h-40'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<ThreatAreaComponent>;

export const SingleEnemy: Story = {
  args: {
    threatArea: [testEnemy],
  },
};

export const SeveralEnemies: Story = {
  args: {
    threatArea: [testEnemy, testEnemy, testEnemy2],
  },
};

export const WithMassiveEnemy: Story = {
  args: {
    threatArea: [testEnemy, testMassiveEnemy],
  },
};
