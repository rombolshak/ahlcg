import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { GlobalGameActionsComponent } from './global-game-actions.component';
import { action } from 'storybook/actions';

const meta: Meta<GlobalGameActionsComponent> = {
  component: GlobalGameActionsComponent,
  decorators: [
    componentWrapperDecorator((story) => `<div class='w-70'>${story}</div>`),
  ],
};

export default meta;
type Story = StoryObj<GlobalGameActionsComponent>;

export const Normal: Story = {
  args: {
    actions: [
      {
        icon: 'chaosbag',
        tooltip: 'chaosbag',
        isVisible: true,
        handler: action('chaosbag'),
        svgFill: true,
      },
      {
        icon: 'speaker-wave',
        tooltip: 'mute',
        isVisible: true,
        handler: action('mute'),
      },
      {
        icon: 'arrows-out',
        tooltip: 'fullscreen',
        isVisible: true,
        handler: action('fullscreen'),
      },
      {
        icon: 'menu',
        tooltip: 'menu',
        isVisible: true,
        handler: action('menu'),
      },
    ],
  },
};
