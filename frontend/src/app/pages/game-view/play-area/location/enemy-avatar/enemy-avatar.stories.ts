import {
  testEnemy,
  testMassiveEnemy,
} from '@domain/test/entities/test-enemies';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { EnemyAvatarComponent } from './enemy-avatar.component';

const meta: Meta<EnemyAvatarComponent> = {
  component: EnemyAvatarComponent,
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div class='w-33 mt-40 ml-20 text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<EnemyAvatarComponent>;

export const Normal: Story = {
  args: {
    enemy: testEnemy,
  },
};

export const Massive: Story = {
  args: {
    enemy: testMassiveEnemy,
  },
};

export const Hovered: Story = {
  args: {
    enemy: testEnemy,
    hovered: true,
  },
};
