import { argsToTemplate, Meta, StoryObj } from '@storybook/angular-vite';
import { DialogComponent } from './dialog.component';

const meta: Meta<DialogComponent> = {
  component: DialogComponent,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<DialogComponent>;

export const Normal: Story = {
  args: {
    title: 'Sample dialog',
    isOpen: true,
    size: 's',
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['s', 'm', 'l'],
    },
  },
  render: args => ({
    props: args,
    template: `<ah-dialog ${argsToTemplate(args)}>Dialog content goes here</ah-dialog>`,
  }),
};

export const Medium: Story = {
  ...Normal,
  args: { ...Normal.args, size: 'm' },
};

export const Large: Story = {
  ...Normal,
  args: { ...Normal.args, size: 'l' },
};
