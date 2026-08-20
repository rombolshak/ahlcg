import { cardE, cardEInfo } from '@domain/testing/entities/test-cards';
import { Meta, StoryObj } from '@storybook/angular-vite';
import { EventCardComponent } from './event-card.component';

const meta: Meta<EventCardComponent> = {
  component: EventCardComponent,
  args: {
    cardInfo: cardEInfo,
    displayOptions: { cardSize: 'l', textSize: 's' },
  },
};

export default meta;
type Story = StoryObj<EventCardComponent>;

export const EventGuardian: Story = {
  args: {
    card: {
      ...cardE,
      faction: 'guardian',
    },
  },
};

export const EventSeeker: Story = {
  args: {
    card: {
      ...cardE,
      faction: 'seeker',
    },
  },
};

export const EventRogue: Story = {
  args: {
    card: {
      ...cardE,
      faction: 'rogue',
    },
  },
};

export const EventSurvivor: Story = {
  args: {
    card: {
      ...cardE,
      faction: 'survivor',
    },
  },
};

export const EventMystic: Story = {
  args: {
    card: {
      ...cardE,
      faction: 'mystic',
    },
  },
};

export const EventNeutral: Story = {
  args: {
    card: {
      ...cardE,
      faction: 'neutral',
    },
  },
};
