import { argsToTemplate, Meta, StoryObj } from '@storybook/angular';
import { CardDetailsTextComponent } from './card-details-text.component';
import { testLocation } from '../../../../shared/domain/test/entities/test-locations';

const meta: Meta<CardDetailsTextComponent> = {
  component: CardDetailsTextComponent,
};

export default meta;
type Story = StoryObj<CardDetailsTextComponent>;

export const WithTitle: Story = {
  args: {
    card: testLocation,
    showTitle: true,
  },
};

export const WithoutTitle: Story = {
  args: {
    card: testLocation,
    showTitle: false,
  },
};

export const WithAdditionalContent: Story = {
  args: {
    card: testLocation,
    showTitle: true,
  },
  render: (args) => ({
    props: args,
    template: `<ah-card-details-text ${argsToTemplate(args)}><span class="text-lime-700 font-bold">Additional content</span></ah-card-details-text>`,
  }),
};
