import { argsToTemplate, Meta, StoryObj } from '@storybook/angular';
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
    id: 'sample',
    open: true,
  },
  render: (args) => ({
    props: args,
    template: `<ah-dialog ${argsToTemplate(args)}>Dialog content goes here</ah-dialog>`,
  }),
};
