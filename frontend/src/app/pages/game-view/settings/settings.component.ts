import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  linkedSignal,
  signal,
  viewChildren,
} from '@angular/core';
import {
  LangDefinition,
  TranslocoDirective,
  TranslocoService,
} from '@jsverse/transloco';
import { produce } from 'immer';
import { SettingsService } from 'shared/services/settings/settings.service';
import {
  provideUserPreferencesService,
  UserPreferences,
} from 'shared/services/settings/user-preferences.service';
import { DialogComponent } from '../../../shared/ui/components/dialog/dialog.component';
import { DialogService } from '../../../shared/ui/components/dialog/dialog.service';
import { SettingItemComponent } from './setting-item/setting-item.component';

@Component({
  selector: 'ah-settings',
  imports: [SettingItemComponent, DialogComponent, TranslocoDirective],
  templateUrl: './settings.component.html',
  styles: ``,
  providers: [provideUserPreferencesService()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'cursor-reset',
  },
})
export class SettingsComponent {
  private readonly userPrefs = inject<SettingsService<UserPreferences>>(
    SettingsService<UserPreferences>,
  );
  private readonly transloco = inject(TranslocoService);
  private readonly dialogService = inject(DialogService);

  private readonly dialogId = 'game-menu';
  protected readonly settings = linkedSignal(() => this.userPrefs.get()());
  protected readonly availableLanguages = this.transloco.getAvailableLangs();

  private readonly settingsElements = viewChildren('setting', {
    read: ElementRef,
  });
  private readonly settingsComponents =
    viewChildren<SettingItemComponent<unknown>>('setting');
  private readonly selectedSettingIndex = signal(-1);

  constructor() {
    effect(() => {
      this.transloco.setActiveLang(this.userPrefs.get()().lang);
    });

    effect(() => {
      const nativeElement = this.settingsElements()[this.selectedSettingIndex()]
        ?.nativeElement as HTMLElement | undefined;
      setTimeout(() => nativeElement?.focus(), 0);
    });
  }

  public openSettings() {
    if (this.dialogService.isOpen('game-menu')) {
      return;
    }

    this.dialogService.open('game-menu');
    this.selectedSettingIndex.set(0);
  }

  protected nextLang(): void {
    const current = this.settings().lang;
    const index = this.availableLanguages.findIndex((l) =>
      typeof l === 'string' ? l === current : l.id === current,
    );
    const newLang =
      this.availableLanguages[(index + 1) % this.availableLanguages.length];
    if (newLang !== undefined) this.setLang(newLang);
  }

  protected prevLang(): void {
    const current = this.settings().lang;
    const index = this.availableLanguages.findIndex((l) =>
      typeof l === 'string' ? l === current : l.id === current,
    );
    const newLang =
      this.availableLanguages[
        (index - 1 + this.availableLanguages.length) %
          this.availableLanguages.length
      ];
    if (newLang !== undefined) this.setLang(newLang);
  }

  protected setLang(lang: LangDefinition | string): void {
    this.settings.update((current) =>
      produce(current, (draft) => {
        draft.lang = typeof lang === 'string' ? lang : lang.id;
      }),
    );
  }

  protected getLangDisplay(current: string): string {
    const lang = this.availableLanguages.find((l) =>
      typeof l === 'string' ? l === current : l.id === current,
    );
    if (!lang) {
      return '<unknown>';
    }
    return typeof lang === 'string' ? lang : lang.label;
  }

  protected applySettings(): void {
    this.userPrefs.set(this.settings());
    this.dialogService.close(this.dialogId);
  }

  protected discardSettings(): void {
    this.settings.set(this.userPrefs.get()());
    this.dialogService.close(this.dialogId);
  }

  @HostListener('body:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        if (!this.dialogService.isOpen('game-menu')) break;
        event.preventDefault();
        this.selectedSettingIndex.update(
          (value) => (value + 1) % this.settingsElements().length,
        );
        break;

      case 'ArrowUp':
        if (!this.dialogService.isOpen('game-menu')) break;
        event.preventDefault();
        this.selectedSettingIndex.update(
          (value) =>
            (value - 1 + this.settingsElements().length) %
            this.settingsElements().length,
        );
        break;

      case 'ArrowLeft':
        if (!this.dialogService.isOpen('game-menu')) break;
        event.preventDefault();
        this.settingsComponents()[
          this.selectedSettingIndex()
        ]?.prevValue.emit();
        break;

      case 'ArrowRight':
        if (!this.dialogService.isOpen('game-menu')) break;
        event.preventDefault();
        this.settingsComponents()[
          this.selectedSettingIndex()
        ]?.nextValue.emit();
        break;

      case 'Enter':
        if (!this.dialogService.isOpen('game-menu')) break;
        event.preventDefault();
        this.applySettings();
        break;

      case 'Escape':
        event.preventDefault();
        if (this.dialogService.isOpen('game-menu')) {
          this.discardSettings();
          this.selectedSettingIndex.set(-1);
        } else {
          this.openSettings();
        }
        break;
    }
  }
}
