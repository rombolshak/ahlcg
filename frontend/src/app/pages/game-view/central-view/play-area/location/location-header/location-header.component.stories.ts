import { LocationHeaderComponent } from './location-header.component';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';
import { testLocation } from '../../../../../../shared/domain/test/entities/test-locations';

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
