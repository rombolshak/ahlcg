import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { applicationConfig, Preview } from '@storybook/angular-vite';
import { getStoryTranslocoModule } from '../src/testing/story-translations';

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [importProvidersFrom(getStoryTranslocoModule()), provideHttpClient()],
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
};

export default preview;
