import { EnemyAvatarComponent } from './enemy-avatar.component';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import {
  testEnemy,
  testMassiveEnemy,
} from '../../../../shared/domain/test/entities/test-enemies';

const meta: Meta<EnemyAvatarComponent> = {
  component: EnemyAvatarComponent,
  decorators: [
    componentWrapperDecorator((story) => `<div class='w-100'>${story}</div>`),
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
