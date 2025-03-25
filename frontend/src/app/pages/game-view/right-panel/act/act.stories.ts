import { Meta, StoryObj } from '@storybook/angular';
import { ActComponent } from './act.component';
import { testAct } from '../../../../shared/domain/test/test-act';

const meta: Meta<ActComponent> = {
  component: ActComponent,
};

export default meta;
type Story = StoryObj<ActComponent>;

export const ZeroPercent: Story = {
  name: '0% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: '',
          requiredValue: 10,
          currentValue: 0,
          startValue: 0,
          type: 'clue',
        },
      ],
    },
  },
};

export const TenPercent: Story = {
  name: '10% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: '',
          requiredValue: 10,
          currentValue: 1,
          startValue: 0,
          type: 'clue',
        },
      ],
    },
  },
};

export const TwentyPercent: Story = {
  name: '20% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: '',
          requiredValue: 10,
          currentValue: 2,
          startValue: 0,
          type: 'clue',
        },
      ],
    },
  },
};

export const ThirtyPercent: Story = {
  name: '30% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: '',
          requiredValue: 10,
          currentValue: 3,
          startValue: 0,
          type: 'clue',
        },
      ],
    },
  },
};

export const FortyPercent: Story = {
  name: '40% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: '',
          requiredValue: 10,
          currentValue: 4,
          startValue: 0,
          type: 'clue',
        },
      ],
    },
  },
};

export const FiftyPercent: Story = {
  name: '50% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: '',
          requiredValue: 10,
          currentValue: 5,
          startValue: 0,
          type: 'clue',
        },
      ],
    },
  },
};

export const SixtyPercent: Story = {
  name: '60% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: '',
          requiredValue: 10,
          currentValue: 6,
          startValue: 0,
          type: 'clue',
        },
      ],
    },
  },
};

export const SeventyPercent: Story = {
  name: '70% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: '',
          requiredValue: 10,
          currentValue: 7,
          startValue: 0,
          type: 'clue',
        },
      ],
    },
  },
};

export const EightyPercent: Story = {
  name: '80% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: '',
          requiredValue: 10,
          currentValue: 8,
          startValue: 0,
          type: 'clue',
        },
      ],
    },
  },
};

export const NinetyPercent: Story = {
  name: '90% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: '',
          requiredValue: 10,
          currentValue: 9,
          startValue: 0,
          type: 'clue',
        },
      ],
    },
  },
};

export const HundredPercent: Story = {
  name: '100% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: '',
          requiredValue: 10,
          currentValue: 10,
          startValue: 0,
          type: 'clue',
        },
      ],
    },
  },
};

export const ZeroPercentHealth: Story = {
  name: '0% Health',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description:
            '<b>Цель — </b> Когда Сайла Бишоп побежден, продвиньтесь.',
          requiredValue: 0,
          currentValue: 10,
          startValue: 10,
          type: 'health',
        },
      ],
    },
  },
};

export const FiftyPercentHealth: Story = {
  name: '50% Health',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description:
            '<b>Цель — </b> Когда Сайла Бишоп побежден, продвиньтесь.',
          requiredValue: 0,
          currentValue: 5,
          startValue: 10,
          type: 'health',
        },
      ],
    },
  },
};

export const HundredPercentHealth: Story = {
  name: '100% Health',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description:
            '<b>Цель — </b> Когда Сайла Бишоп побежден, продвиньтесь.',
          requiredValue: 0,
          currentValue: 0,
          startValue: 10,
          type: 'health',
        },
      ],
    },
  },
};

export const TwoObjectives: Story = {
  name: 'Two objectives',
  args: {
    act: {
      ...testAct,
    },
  },
};
