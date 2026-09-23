import { MenuItem } from '@pages/main-menu/menu-item';
import { MenuItemsListComponent } from '@pages/main-menu/menu-items-list/menu-items-list.component';
import { Meta, StoryObj } from '@storybook/angular-vite';

const noop = () => {
  /* empty */
};

// `name` is a translation key in the `pages/main-menu/i18n` scope — the template renders `t(name)` — so
// a placeholder like "Item 1" shows an unresolved key. These mirror `MainMenuComponent.mainItems()`,
// so the story shows the menu a player actually sees and the Crowdin screenshot tags real strings.
const signedInItems: MenuItem[] = [
  { name: 'continue', tooltip: { key: 'continue_tooltip', params: { lastPlayed: '12 September 1926' } }, process: noop },
  { name: 'new_game', process: noop },
  { name: 'load_game', process: noop },
  { name: 'decks', process: noop },
  { name: 'settings', process: noop },
];

const meta: Meta<MenuItemsListComponent> = {
  component: MenuItemsListComponent,
  parameters: {
    layout: 'padded',
  },
  args: {
    items: signedInItems,
  },
};

export default meta;
type Story = StoryObj<MenuItemsListComponent>;

export const Normal: Story = {};

// Signed out, `continue` becomes a prompt to sign in and there is no game to resume.
export const SignedOut: Story = {
  args: {
    items: [{ name: 'login_to_continue', process: noop }, ...signedInItems.slice(1)],
  },
};

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
