import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import {
  testEnemy,
  testEnemy2,
} from 'shared/domain/test/entities/test-enemies';
import { ThreatAreaComponent } from './threat-area.component';

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

export const NoEnemies: Story = {
  args: {
    threatArea: [],
  },
};

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
