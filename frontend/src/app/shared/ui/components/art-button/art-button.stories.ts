import { ArtButtonComponent } from '@shared/components/art-button/art-button.component';
import { Meta, StoryObj } from '@storybook/angular';

const meta: Meta<ArtButtonComponent> = {
  component: ArtButtonComponent,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<ArtButtonComponent>;

export const Normal: Story = {
  render: (args) => ({
    props: args,
    template: `<button ah-art-button type="button">Default</button>`,
  }),
};

export const Colored: Story = {
  render: (args) => ({
    props: args,
    template: `
      <button ah-art-button type="button" class="btn-primary">Primary</button>
      <button ah-art-button type="button" class="btn-secondary">Secondary</button>
      <button ah-art-button type="button" class="btn-accent">Accent</button>
      <button ah-art-button type="button" class="btn-error">Error</button>
    `,
  }),
};

export const Sized: Story = {
  render: (args) => ({
    props: args,
    template: `
      <button ah-art-button type="button" class="btn-xs">Extra small</button>
      <button ah-art-button type="button" class="btn-sm">Small</button>
      <button ah-art-button type="button">Default</button>
      <button ah-art-button type="button" class="btn-lg">Large</button>
      <button ah-art-button type="button" class="btn-xl">Extra large</button>
    `,
  }),
};
