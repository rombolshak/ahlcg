import { Meta, StoryObj } from '@storybook/angular';
import { CardComponent } from './card.component';
import { cardA, cardE, cardS } from '../../../../domain/test/test-cards';

const meta: Meta<CardComponent> = {
  component: CardComponent,
  args: {
    displayOptions: { cardSize: 'l', textSize: 's' },
  },
};

export default meta;
type Story = StoryObj<CardComponent>;

export const Skill: Story = {
  args: {
    card: cardS,
  },
};

export const Asset: Story = {
  args: {
    card: cardA,
  },
};

export const Event: Story = {
  args: {
    card: cardE,
  },
};
