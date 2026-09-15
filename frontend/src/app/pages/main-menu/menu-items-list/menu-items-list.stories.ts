import { MenuItemsListComponent } from '@pages/main-menu/menu-items-list/menu-items-list.component';
import { Meta, StoryObj } from '@storybook/angular-vite';

const meta: Meta<MenuItemsListComponent> = {
  component: MenuItemsListComponent,
  parameters: {
    layout: 'padded',
  },
  args: {
    items: [
      {
        name: 'new_game',
        tooltip: { key: 'main_menu.new_game' },
        process: () => {
          alert('new game');
        },
      },
      {
        name: 'Item 1',
        process: () => {
          alert('settings');
        },
      },
      {
        name: 'Item 2',
        process: () => {
          alert('settings');
        },
      },
      {
        name: 'Item 3',
        process: () => {
          alert('settings');
        },
      },
    ],
  },
};

export default meta;
type Story = StoryObj<MenuItemsListComponent>;

export const Normal: Story = {};

// Chromatic pauses a CSS animation at the end of its cycle, and `loading-spinner` is infinite —
// it has no end, so the captured frame is arbitrary. `false` pins it to the first frame instead.
export const Busy: Story = {
  parameters: {
    chromatic: { pauseAnimationAtEnd: false },
  },
  args: {
    items: [
      {
        name: 'new_game',
        busy: true,
        process: () => {
          alert('new game');
        },
      },
    ],
  },
};
