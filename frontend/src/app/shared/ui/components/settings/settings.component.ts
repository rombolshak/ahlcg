import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, linkedSignal, signal, viewChildren } from '@angular/core';
import { LangDefinition, TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { InputLayer } from '@services/input-manager.service';
import { AH_DIALOG_CONTENT, DialogContent } from '@shared/components/dialog/dialog.content';
import { AH_DIALOG_CONTEXT } from '@shared/components/dialog/dialog.context';
import { produce } from 'immer';
import { SettingsService } from 'shared/services/settings/settings.service';
import { provideUserPreferencesService, UserPreferences } from 'shared/services/settings/user-preferences.service';
import { SettingItemComponent } from './setting-item/setting-item.component';

@Component({
  selector: 'ah-settings',
  imports: [SettingItemComponent, TranslocoDirective],
  templateUrl: './settings.component.html',
  styles: ``,
  providers: [
    provideUserPreferencesService(),
    {
      provide: AH_DIALOG_CONTENT,
      useExisting: SettingsComponent,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'cursor-reset',
  },
})
export class SettingsComponent implements DialogContent {
  private readonly userPrefs = inject<SettingsService<UserPreferences>>(SettingsService<UserPreferences>);
  private readonly transloco = inject(TranslocoService);
  private readonly dialog = inject(AH_DIALOG_CONTEXT, { host: true });

  protected readonly settings = linkedSignal(() => this.userPrefs.get()());
  protected readonly availableLanguages = this.transloco.getAvailableLangs();

  private readonly settingsElements = viewChildren('setting', {
    read: ElementRef,
  });
  private readonly settingsComponents = viewChildren<SettingItemComponent<unknown>>('setting');
  private readonly selectedSettingIndex = signal(-1);

  constructor() {
    effect(() => {
      this.transloco.setActiveLang(this.userPrefs.get()().lang);
    });

    effect(() => {
      const nativeElement = this.settingsElements()[this.selectedSettingIndex()]?.nativeElement as HTMLElement | undefined;
      setTimeout(() => nativeElement?.focus(), 0);
    });
  }

  public onOpened = () => {
    this.selectedSettingIndex.set(0);
  };

  public getInputHandlers: () => InputLayer = () => {
    return {
      cancel: this.discardSettings.bind(this),
      confirm: this.applySettings.bind(this),
      moveDown: () => {
        this.selectedSettingIndex.update(value => (value + 1) % this.settingsElements().length);
      },
      moveUp: () => {
        this.selectedSettingIndex.update(value => (value - 1 + this.settingsElements().length) % this.settingsElements().length);
      },
      moveLeft: () => {
        this.settingsComponents()[this.selectedSettingIndex()]?.prevValue.emit();
      },
      moveRight: () => {
        this.settingsComponents()[this.selectedSettingIndex()]?.nextValue.emit();
      },
    };
  };

  protected nextLang(): void {
    const current = this.settings().lang;
    const index = this.availableLanguages.findIndex(l => (typeof l === 'string' ? l === current : l.id === current));
    const newLang = this.availableLanguages[(index + 1) % this.availableLanguages.length];
    if (newLang !== undefined) this.setLang(newLang);
  }

  protected prevLang(): void {
    const current = this.settings().lang;
    const index = this.availableLanguages.findIndex(l => (typeof l === 'string' ? l === current : l.id === current));
    const newLang = this.availableLanguages[(index - 1 + this.availableLanguages.length) % this.availableLanguages.length];
    if (newLang !== undefined) this.setLang(newLang);
  }

  protected setLang(lang: LangDefinition | string): void {
    this.settings.update(current =>
      produce(current, draft => {
        draft.lang = typeof lang === 'string' ? lang : lang.id;
      }),
    );
  }

  protected getLangDisplay(current: string): string {
    const lang = this.availableLanguages.find(l => (typeof l === 'string' ? l === current : l.id === current));
    if (!lang) {
      return '<unknown>';
    }
    return typeof lang === 'string' ? lang : lang.label;
  }

  protected applySettings(): void {
    this.userPrefs.set(this.settings());
    this.dialog.close();
  }

  protected discardSettings(): void {
    this.settings.set(this.userPrefs.get()());
    this.dialog.close();
  }
}
