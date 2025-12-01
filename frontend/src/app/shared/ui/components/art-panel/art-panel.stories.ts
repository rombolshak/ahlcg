import { ArtPanelComponent } from '@shared/components/art-panel/art-panel.component';
import { argsToTemplate, Meta, StoryObj } from '@storybook/angular';

const meta: Meta<ArtPanelComponent> = {
  component: ArtPanelComponent,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<ArtPanelComponent>;

export const Normal: Story = {
  render: (args) => ({
    props: args,
    template: `<ah-art-panel ${argsToTemplate(args)}>
<h1>Art Deco Card</h1>
<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Aliquid error facere quidem quas odit doloribus quos ex beatae quia odio sed vitae dolorum sunt hic corrupti, accusantium perferendis ullam unde?</p>
</ah-art-panel>`,
  }),
};
