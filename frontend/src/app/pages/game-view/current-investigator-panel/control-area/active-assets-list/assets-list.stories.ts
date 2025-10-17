import {
  cardA,
  cardA2,
  cardA3,
  cardA4,
  cardA5,
  cardA6,
} from '@domain/test/entities/test-cards';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { AssetsListComponent } from 'pages/game-view/current-investigator-panel/control-area/active-assets-list/assets-list.component';
import { ControlledAssetComponent } from '../controlled-asset/controlled-asset.component';

const meta: Meta<ControlledAssetComponent> = {
  component: AssetsListComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class="w-[22rem]">${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<AssetsListComponent>;

export const Simple: Story = {
  args: {
    activeAssets: [cardA, cardA2, cardA3, cardA4, cardA5, cardA6],
  },
};
