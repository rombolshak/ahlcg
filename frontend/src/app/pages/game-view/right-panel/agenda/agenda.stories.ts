import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { AgendaComponent } from './agenda.component';
import { testAgenda } from 'shared/domain/test/entities/test-agenda';

const meta: Meta<AgendaComponent> = {
  component: AgendaComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div style="width: 300px; margin: 3em;">${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<AgendaComponent>;

export const ZeroPercent: Story = {
  name: '0% Agenda',
  args: {
    agenda: {
      ...testAgenda,
      requiredDoom: 10,
      currentDoom: 0,
    },
  },
};

export const TenPercent: Story = {
  name: '10% Agenda',
  args: {
    agenda: {
      ...testAgenda,
      requiredDoom: 10,
      currentDoom: 1,
    },
  },
};

export const TwentyPercent: Story = {
  name: '20% Agenda',
  args: {
    agenda: {
      ...testAgenda,
      requiredDoom: 10,
      currentDoom: 2,
    },
  },
};

export const ThirtyPercent: Story = {
  name: '30% Agenda',
  args: {
    agenda: {
      ...testAgenda,
      requiredDoom: 10,
      currentDoom: 3,
    },
  },
};

export const FortyPercent: Story = {
  name: '40% Agenda',
  args: {
    agenda: {
      ...testAgenda,
      requiredDoom: 10,
      currentDoom: 4,
    },
  },
};

export const FiftyPercent: Story = {
  name: '50% Agenda',
  args: {
    agenda: {
      ...testAgenda,
      requiredDoom: 10,
      currentDoom: 5,
    },
  },
};

export const SixtyPercent: Story = {
  name: '60% Agenda',
  args: {
    agenda: {
      ...testAgenda,
      requiredDoom: 10,
      currentDoom: 6,
    },
  },
};

export const SeventyPercent: Story = {
  name: '70% Agenda',
  args: {
    agenda: {
      ...testAgenda,
      requiredDoom: 10,
      currentDoom: 7,
    },
  },
};

export const EightyPercent: Story = {
  name: '80% Agenda',
  args: {
    agenda: {
      ...testAgenda,
      requiredDoom: 10,
      currentDoom: 8,
    },
  },
};

export const NinetyPercent: Story = {
  name: '90% Agenda',
  args: {
    agenda: {
      ...testAgenda,
      requiredDoom: 10,
      currentDoom: 9,
    },
  },
};

export const HundredPercent: Story = {
  name: '100% Agenda',
  args: {
    agenda: {
      ...testAgenda,
      requiredDoom: 10,
      currentDoom: 10,
    },
  },
};
