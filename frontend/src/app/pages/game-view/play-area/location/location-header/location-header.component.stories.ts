import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { testLocation } from 'shared/domain/test/entities/test-locations';
import { LocationHeaderComponent } from './location-header.component';

const meta: Meta<LocationHeaderComponent> = {
  component: LocationHeaderComponent,
  decorators: [
    componentWrapperDecorator(
      (story) => `<div class='w-200 mt-40 relative'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<LocationHeaderComponent>;

export const Normal: Story = {
  args: {
    location: testLocation,
  },
};

export const Hovered: Story = {
  args: {
    ...Normal.args,
    hovered: true,
  },
};
