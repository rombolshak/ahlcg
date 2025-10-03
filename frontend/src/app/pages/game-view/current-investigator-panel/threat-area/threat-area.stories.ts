import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import {
  testEnemy,
  testEnemy2,
} from 'shared/domain/test/entities/test-enemies';
import { ThreatAreaComponent } from './threat-area.component';

const meta: Meta<ThreatAreaComponent> = {
  component: ThreatAreaComponent,
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div class='w-[20rem] flex flex-col text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<ThreatAreaComponent>;

export const NoEnemies: Story = {
  args: {
    threatArea: [],
    noThreatsText: 'No threats text goes here.',
    threatsSeverity: { healthSeverity: 0, sanitySeverity: 0 },
  },
};

export const SingleEnemy: Story = {
  args: {
    threatArea: [testEnemy],
    noThreatsText: 'No threats text goes here.',
    threatsSeverity: { healthSeverity: 0.5, sanitySeverity: 0.5 },
  },
};

export const SeveralEnemies: Story = {
  args: {
    threatArea: [testEnemy, testEnemy, testEnemy2],
    noThreatsText: 'No threats text goes here.',
    threatsSeverity: { healthSeverity: 0.5, sanitySeverity: 0.5 },
  },
};

export const SeverityOnlyHealth: Story = {
  args: {
    threatArea: [testEnemy, testEnemy],
    noThreatsText: 'No threats text goes here.',
    threatsSeverity: { healthSeverity: 0.5, sanitySeverity: 0 },
  },
};

export const SeverityOnlySanity: Story = {
  args: {
    threatArea: [testEnemy, testEnemy],
    noThreatsText: 'No threats text goes here.',
    threatsSeverity: { healthSeverity: 0, sanitySeverity: 0.5 },
  },
};

export const SeverityHealthDeadly: Story = {
  args: {
    threatArea: [testEnemy],
    noThreatsText: 'No threats text goes here.',
    threatsSeverity: { healthSeverity: 1, sanitySeverity: 0.5 },
  },
};

export const SeveritySanityDeadly: Story = {
  args: {
    threatArea: [testEnemy],
    noThreatsText: 'No threats text goes here.',
    threatsSeverity: { healthSeverity: 0.5, sanitySeverity: 1 },
  },
};
