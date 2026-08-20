import { cardA, cardA2, cardA3, cardA4, cardA5, cardA6 } from '@domain/testing/entities/test-cards';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular-vite';
import { AssetsListComponent } from './assets-list.component';

const meta: Meta<AssetsListComponent> = {
  component: AssetsListComponent,
  decorators: [componentWrapperDecorator(story => `<div class="w-[22rem]">${story}</div>`)],
};

export default meta;
type Story = StoryObj<AssetsListComponent>;

export const Simple: Story = {
  args: {
    activeAssets: [cardA, cardA2, cardA3, cardA4, cardA5, cardA6],
    passiveAssets: [cardA, cardA2, cardA3, cardA4, cardA5, cardA6],
  },
};
