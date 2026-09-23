import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, Translation, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { TranslocoHttpLoader } from './transloco-loader';

const SCOPE = 'features/settings/i18n';

describe('TranslocoHttpLoader', () => {
  let loader: TranslocoHttpLoader;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTransloco({
          config: {
            availableLangs: [
              { id: 'en', label: 'English' },
              { id: 'fr', label: 'Français' },
            ],
            defaultLang: 'en',
            fallbackLang: 'en',
            missingHandler: { useFallbackTranslation: true },
            scopes: { keepCasing: true },
            failedRetries: 0,
          },
          loader: TranslocoHttpLoader,
        }),
      ],
    });

    loader = TestBed.inject(TranslocoHttpLoader);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should resolve a bare language to an empty translation without a request', async () => {
    // given no root translation file exists — every chrome string lives in a scope
    // when the active language itself is requested
    const translation = await firstValueFrom(loader.getTranslation('fr'));

    // then nothing is fetched and the root is simply empty
    expect(translation).toEqual({});
    http.expectNone('/assets/i18n/fr.json');
  });

  it('should fetch a scope file for a language that has one', async () => {
    // given a scope translated into French
    const pending = firstValueFrom(loader.getTranslation(`${SCOPE}/fr`));

    // when the file is served
    http.expectOne(`/assets/i18n/${SCOPE}/fr.json`).flush({ title: 'Paramètres' } satisfies Translation);

    // then its contents come back
    await expect(pending).resolves.toEqual({ title: 'Paramètres' });
  });

  it('should treat a missing scope file as empty rather than as a failure', async () => {
    // given a scope nobody has translated into French
    const pending = firstValueFrom(loader.getTranslation(`${SCOPE}/fr`));

    // when its file 404s
    http.expectOne(`/assets/i18n/${SCOPE}/fr.json`).flush('Not Found', { status: 404, statusText: 'Not Found' });

    // then the load succeeds with nothing, leaving the per-key English fallback to fill in
    await expect(pending).resolves.toEqual({});
  });

  it('should still report a server error, which is a real fault', async () => {
    // given the asset server is broken rather than the file merely absent
    const pending = firstValueFrom(loader.getTranslation(`${SCOPE}/fr`));

    // when the request fails with something other than a 404
    http.expectOne(`/assets/i18n/${SCOPE}/fr.json`).flush('Boom', { status: 500, statusText: 'Server Error' });

    // then it is not swallowed
    await expect(pending).rejects.toBeInstanceOf(HttpErrorResponse);
  });

  it('should keep the active language when a scope has no file for it', async () => {
    // given French is active
    const transloco = TestBed.inject(TranslocoService);
    transloco.setActiveLang('fr');

    // when a scope with no French file is loaded
    const pending = firstValueFrom(transloco.load(`${SCOPE}/fr`));
    http.expectOne(`/assets/i18n/${SCOPE}/fr.json`).flush('Not Found', { status: 404, statusText: 'Not Found' });
    http.expectOne(`/assets/i18n/${SCOPE}/en.json`).flush({ title: 'Settings' } satisfies Translation);
    await pending;

    // then the whole app does not fall back to English — TranslocoService makes the fallback's
    // language active whenever a load is recorded as a failure, so this is the regression guard
    expect(transloco.getActiveLang()).toBe('fr');
  });
});
