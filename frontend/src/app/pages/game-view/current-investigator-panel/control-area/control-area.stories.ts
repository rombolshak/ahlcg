/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Meta, StoryObj } from '@storybook/angular';
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
};

export default meta;
type Story = StoryObj<ControlAreaComponent>;

export const Simple: Story = {
  args: {
    assets: [
      SimpleAsset.args!.asset!,
      WithSlot.args!.asset!,
      WithResource.args!.asset!,
      WithClue.args!.asset!,
      SeveralIcons.args!.asset!,
      WithDoom.args!.asset!,
    ],
  },
};
