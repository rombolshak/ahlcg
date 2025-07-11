import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { NumericTextComponent } from './numeric-text.component';

const meta: Meta<NumericTextComponent> = {
  component: NumericTextComponent,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<NumericTextComponent>;

export const Normal: Story = {
  decorators: [
    componentWrapperDecorator(
      (story) => `
<div>Update 'value' input to see component in action</div>
<div class="text-4xl">${story}</div>`,
    ),
  ],
  args: {
    value: 3,
  },
};
