import { testActions } from '@domain/test/test-actions';
import { InvestigatorActionsComponent } from '@pages/game-view/current-investigator-panel/actions-area/investigator-actions/investigator-actions.component';
import { componentWrapperDecorator, Meta, StoryObj } from '@storybook/angular';

const meta: Meta<InvestigatorActionsComponent> = {
  component: InvestigatorActionsComponent,
  decorators: [
    componentWrapperDecorator(
      (story) =>
        `<div class='w-[20rem] mt-10 ml-10 flex flex-col text-neutral-900'>${story}</div>`,
    ),
  ],
};

export default meta;
type Story = StoryObj<InvestigatorActionsComponent>;

export const Simple: Story = {
  args: {
    actions: testActions,
  },
};
