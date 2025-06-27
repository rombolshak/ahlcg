import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  linkedSignal,
} from '@angular/core';
import {
  provideUserPreferencesService,
  UserPreferences,
} from 'shared/services/settings/user-preferences.service';
import { LangDefinition, TranslocoService } from '@jsverse/transloco';
import { LanguageSelectorComponent } from './language-selector/language-selector.component';
import { SettingsService } from 'shared/services/settings/settings.service';
import { produce } from 'immer';

@Component({
  selector: 'ah-settings',
  imports: [LanguageSelectorComponent],
  templateUrl: './settings.component.html',
  styles: ``,
  providers: [provideUserPreferencesService()],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  private readonly userPrefs = inject<SettingsService<UserPreferences>>(
    SettingsService<UserPreferences>,
  );
  private readonly transloco = inject(TranslocoService);

  protected readonly settings = linkedSignal(() => this.userPrefs.get()());
  protected readonly availableLanguages = this.transloco.getAvailableLangs();

  constructor() {
    effect(() => {
      this.transloco.setActiveLang(this.userPrefs.get()().lang);
    });
  }

  protected setLang(lang: LangDefinition | string): void {
    this.settings.update((current) =>
      produce(current, (draft) => {
        draft.lang = typeof lang === 'string' ? lang : lang.id;
      }),
    );
  }

  protected applySettings(): void {
    this.userPrefs.set(this.settings());
  }
}
