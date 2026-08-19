import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { imageUrl } from '@domain/card-art/image-url';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'ah-title',
  imports: [NgOptimizedImage],
  template: '<img width="781" height="193" alt="Arkham Horror title" priority [ngSrc]="img()" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitleComponent {
  private readonly transloco = inject(TranslocoService);

  private readonly lang = toSignal(this.transloco.langChanges$);
  protected readonly img = computed(() => imageUrl(`title/${this.lang() ?? 'en'}`));
}
