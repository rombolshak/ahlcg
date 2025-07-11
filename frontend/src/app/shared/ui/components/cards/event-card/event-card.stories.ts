import { Meta, StoryObj } from '@storybook/angular';
import { cardE } from '../../../../domain/test/entities/test-cards';
import { EventCardComponent } from './event-card.component';

const meta: Meta<EventCardComponent> = {
  component: EventCardComponent,
  args: {
    displayOptions: { cardSize: 'l', textSize: 's' },
  },
};

export default meta;
type Story = StoryObj<EventCardComponent>;

export const EventGuardian: Story = {
  args: {
    card: {
      ...cardE,
      class: 'guardian',
    },
  },
};

export const EventSeeker: Story = {
  args: {
    card: {
      ...cardE,
      class: 'seeker',
    },
  },
};

export const EventRogue: Story = {
  args: {
    card: {
      ...cardE,
      class: 'rogue',
    },
  },
};

export const EventSurvivor: Story = {
  args: {
    card: {
      ...cardE,
      class: 'survivor',
    },
  },
};

export const EventMystic: Story = {
  args: {
    card: {
      ...cardE,
      class: 'mystic',
    },
  },
};

export const EventNeutral: Story = {
  args: {
    card: {
      ...cardE,
      class: 'neutral',
    },
  },
};
