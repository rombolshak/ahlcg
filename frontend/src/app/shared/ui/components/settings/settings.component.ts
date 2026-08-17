import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal, viewChild, viewChildren } from '@angular/core';
import { LangDefinition, TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { InputLayer } from '@services/input-manager.service';
import { listNavigation } from '@services/list-navigation';
import { SettingsService } from '@services/settings/settings.service';
import { provideUserPreferencesService, UserPreferences } from '@services/settings/user-preferences.service';
import { AH_DIALOG_CONTENT, DialogContent } from '@shared/components/dialog/dialog.content';
import { AH_DIALOG_CONTEXT } from '@shared/components/dialog/dialog.context';
import { produce } from 'immer';
import { AccountComponent } from './account/account.component';
import { SettingItemComponent } from './setting-item/setting-item.component';

type View = 'settings' | 'account';

type Row = { kind: 'setting'; index: number } | { kind: 'account' } | { kind: 'buttons' };

interface DialogButton {
  key: 'apply' | 'discard';
  process: () => void;
}

@Component({
  selector: 'ah-settings',
  imports: [SettingItemComponent, AccountComponent, TranslocoDirective],
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

  protected readonly view = signal<View>('settings');

  private readonly settingsComponents = viewChildren<SettingItemComponent<unknown>>('setting');
  private readonly account = viewChild(AccountComponent);

  protected readonly accountRowIndex = computed(() => this.settingsComponents().length);
  protected readonly buttonsRowIndex = computed(() => this.settingsComponents().length + 1);

  private readonly rows = computed<Row[]>(() => [
    ...this.settingsComponents().map((_, index) => ({ kind: 'setting' as const, index })),
    { kind: 'account' as const },
    { kind: 'buttons' as const },
  ]);
  private readonly navigation = listNavigation({ items: this.rows });
  protected readonly selectedIndex = this.navigation.selectedIndex;

  private readonly buttons = signal<DialogButton[]>([
    {
      key: 'apply',
      process: () => {
        this.applySettings();
      },
    },
    {
      key: 'discard',
      process: () => {
        this.discardSettings();
      },
    },
  ]);
  private readonly buttonsNavigation = listNavigation({
    items: this.buttons,
    onConfirm: button => {
      button.process();
    },
    orientation: 'horizontal',
  });
  protected readonly selectedButtonIndex = this.buttonsNavigation.selectedIndex;
  protected readonly isButtonsRowSelected = computed(() => this.rows()[this.selectedIndex()]?.kind === 'buttons');

  constructor() {
    effect(() => {
      this.transloco.setActiveLang(this.userPrefs.get()().lang);
    });
  }

  public onOpened = () => {
    this.view.set('settings');
    this.selectedIndex.set(0);
  };

  /**
   * The account view renames the dialog rather than printing a heading of its own, which would sit
   * under a "Settings" title that no longer describes it. `undefined` leaves the dialog's own title
   * in place, so the settings view needs no key here.
   */
  public getTitle = () => (this.view() === 'account' ? this.transloco.translate('settings.account.title') : undefined);

  public getInputHandlers: () => InputLayer = () => {
    if (this.view() === 'account') {
      return this.account()?.getInputHandlers() ?? {};
    }

    const row = this.rows()[this.selectedIndex()];
    return {
      ...this.navigation.handlers,
      cancel: this.discardSettings.bind(this),
      moveLeft: () => {
        if (row?.kind === 'buttons') this.buttonsNavigation.movePrevious();
        else if (row?.kind === 'setting') this.settingsComponents()[row.index]?.prevValue.emit();
      },
      moveRight: () => {
        if (row?.kind === 'buttons') this.buttonsNavigation.moveNext();
        else if (row?.kind === 'setting') this.settingsComponents()[row.index]?.nextValue.emit();
      },
      confirm: () => {
        if (row?.kind === 'account') this.view.set('account');
        else if (row?.kind === 'buttons') void this.buttonsNavigation.handlers.confirm?.();
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
