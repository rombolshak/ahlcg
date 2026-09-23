import { Directive, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

/**
 * `*transloco` wants the scope twice — `scope` loads the file, `prefix` puts the scope in front of
 * every key — and here the two are always the same path. Naming it once removes the chance of the
 * pair drifting apart, which fails silently: the file loads and every key misses.
 */
@Directive({
  selector: '[ahTransloco]',
})
export class ScopedTranslocoDirective extends TranslocoDirective {
  readonly ahTransloco = input.required<string>();

  override ngOnInit() {
    this.inlineScope = this.ahTransloco();
    this.prefix = this.ahTransloco();
    super.ngOnInit();
  }
}
