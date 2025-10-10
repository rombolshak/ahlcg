import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import {
  cardA,
  cardA2,
  cardA3,
  cardA4,
  cardA5,
  cardA6,
} from '../../../../../shared/domain/test/entities/test-cards';
import { ControlledAssetComponent } from '../controlled-asset/controlled-asset.component';
import { PassiveAssetsListComponent } from './passive-assets-list.component';

const meta: Meta<ControlledAssetComponent> = {
  component: PassiveAssetsListComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class="w-[22rem]">${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<PassiveAssetsListComponent>;

export const Simple: Story = {
  args: {
    assets: [cardA, cardA2, cardA3, cardA4, cardA5, cardA6],
  },
};
