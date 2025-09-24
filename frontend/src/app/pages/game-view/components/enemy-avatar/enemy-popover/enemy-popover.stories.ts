import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { testEnemy } from '../../../../../shared/domain/test/entities/test-enemies';
import { EnemyPopoverComponent } from './enemy-popover.component';

const meta: Meta<EnemyPopoverComponent> = {
  component: EnemyPopoverComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='w-70 text-neutral-900 relative'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<EnemyPopoverComponent>;

export const Example: Story = {
  args: {
    enemy: testEnemy,
  },
};
