import { applicationConfig, Preview } from '@storybook/angular';
import { getTranslocoModule } from '../src/app/shared/domain/test/transloco.testing';
import { importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [
        importProvidersFrom(getTranslocoModule()),
        provideHttpClient(),
      ],
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
