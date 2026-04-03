import { MenuItemsListComponent } from '@pages/main-menu/menu-items-list/menu-items-list.component';
import { Meta, StoryObj } from '@storybook/angular';

const meta: Meta<MenuItemsListComponent> = {
  component: MenuItemsListComponent,
  parameters: {
    layout: 'padded',
  },
  args: {
    items: [
      {
        name: 'new_game',
        tooltip: 'Start new game',
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
