import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  output,
} from '@angular/core';

type LangDef = string | { id: string; label: string };

@Component({
  selector: 'ah-language-selector',
  imports: [],
  templateUrl: './language-selector.component.html',
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSelectorComponent {
  readonly availableLanguages = input.required<LangDef[]>();
  readonly initialLanguage = input.required<string>();
  readonly languageSelected = output<LangDef>();

  constructor() {
    effect(() => {
      const langDef = this.availableLanguages()[this.currentIndex()];
      if (!langDef) return;

      this.languageSelected.emit(langDef);
    });
  }

  private readonly currentIndex = linkedSignal(() =>
    this.availableLanguages().findIndex((lang) =>
      typeof lang === 'string'
        ? lang === this.initialLanguage()
        : lang.id === this.initialLanguage(),
    ),
  );
  protected readonly currentLanguage = computed(() => {
    const lang = this.availableLanguages()[this.currentIndex()];
    if (!lang) return '<unknown>';
    if (typeof lang === 'string') return lang;
    return lang.label;
  });

  protected prevLang(): void {
    this.currentIndex.update(
      (value) =>
        (value - 1 + this.availableLanguages().length) %
        this.availableLanguages().length,
    );
  }

  protected nextLang(): void {
    this.currentIndex.update(
      (value) => (value + 1) % this.availableLanguages().length,
    );
  }
}
