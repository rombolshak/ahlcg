/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { defaultSlots } from '../../../../shared/domain/test/entities/test-investigators';
import { ControlAreaComponent } from './control-area.component';
import {
  SeveralIcons,
  Simple as SimpleAsset,
  WithClue,
  WithDoom,
  WithResource,
  WithSlot,
} from './controlled-asset/controlled-asset.stories';

const meta: Meta<ControlAreaComponent> = {
  component: ControlAreaComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='w-[22rem] text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<ControlAreaComponent>;

export const Simple: Story = {
  args: {
    faction: 'rogue',
    assets: [
      SimpleAsset.args!.asset!,
      WithSlot.args!.asset!,
      WithResource.args!.asset!,
      WithClue.args!.asset!,
      SeveralIcons.args!.asset!,
      WithDoom.args!.asset!,
    ],
    maxSlotsCounts: defaultSlots,
  },
};
