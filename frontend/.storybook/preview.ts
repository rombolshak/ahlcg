import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { applicationConfig, Preview } from '@storybook/angular-vite';
import isChromatic from 'chromatic/isChromatic';
import { getTranslocoModule } from '../src/testing/transloco.testing';

// daisyUI's spinner animates inside an SVG mask image, which Chromatic cannot pause.
if (isChromatic()) {
  const staticArc = `<svg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'><circle cx='12' cy='12' r='9.5' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-dasharray='42,150'/></svg>`;
  const staticSpinner = document.createElement('style');
  staticSpinner.textContent = `.loading-spinner { mask-image: url("data:image/svg+xml,${encodeURIComponent(staticArc)}"); }`;
  document.head.append(staticSpinner);
}

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [importProvidersFrom(getTranslocoModule()), provideHttpClient()],
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
