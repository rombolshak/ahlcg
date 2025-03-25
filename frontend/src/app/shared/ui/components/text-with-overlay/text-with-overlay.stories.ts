import { Meta, StoryObj } from '@storybook/angular';
import { TextWithOverlayComponent } from './text-with-overlay.component';

const meta: Meta<TextWithOverlayComponent> = {
  component: TextWithOverlayComponent,
};

export default meta;
type Story = StoryObj<TextWithOverlayComponent>;

export const Default: Story = {
  args: {
    text: 'Example',
  },
};
