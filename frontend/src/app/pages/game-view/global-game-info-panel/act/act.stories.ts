import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { ActComponent } from './act.component';
import { testAct } from '../../../../shared/domain/test/entities/test-act';
import { Objective } from '../../../../shared/domain/entities/act.model';

const meta: Meta<ActComponent> = {
  component: ActComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div style="width: 300px; margin: 3em;">${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<ActComponent>;

const clueObj = {
  description: '',
  requiredValue: 10,
  currentValue: 0,
  startValue: 0,
  type: 'clue',
} satisfies Objective;

export const ZeroPercent: Story = {
  name: '0% Clues',
  args: {
    act: {
      ...testAct,
      objectives: [clueObj],
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
          ...clueObj,
          currentValue: 1,
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
          ...clueObj,
          currentValue: 2,
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
          ...clueObj,
          currentValue: 3,
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
          ...clueObj,
          currentValue: 4,
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
          ...clueObj,
          currentValue: 5,
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
          ...clueObj,
          currentValue: 6,
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
          ...clueObj,
          currentValue: 7,
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
          ...clueObj,
          currentValue: 8,
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
          ...clueObj,
          currentValue: 9,
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
          ...clueObj,
          currentValue: 10,
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
          description: testAct.objectives[0]?.description ?? '<no text>',
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
          description: testAct.objectives[0]?.description ?? '<no text>',
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
  ...ZeroPercent,
  name: '100% Health',
  args: {
    act: {
      ...testAct,
      objectives: [
        {
          description: testAct.objectives[0]?.description ?? '<no text>',
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
  ...ZeroPercent,
  name: 'Two objectives',
  args: {
    act: {
      ...testAct,
    },
  },
};
