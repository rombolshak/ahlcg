import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { AssetSlot } from '../../../../../shared/domain/entities/player-card.model';
import { defaultSlots } from '../../../../../shared/domain/test/entities/test-investigators';
import { ControlledAssetComponent } from '../controlled-asset/controlled-asset.component';
import { EmptySlotsListComponent } from './empty-slots-list.component';

const meta: Meta<ControlledAssetComponent> = {
  component: EmptySlotsListComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class="w-[22rem] text-neutral-900">${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<EmptySlotsListComponent>;

export const Simple: Story = {
  args: {
    slots: Object.keys(defaultSlots) as AssetSlot[],
  },
};
