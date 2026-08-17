import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ImagesUrlService } from '@core/images-url.service';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'ah-title',
  imports: [NgOptimizedImage],
  template: '<img width="781" height="193" alt="Arkham Horror title" priority [ngSrc]="img()" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitleComponent {
  private readonly transloco = inject(TranslocoService);
  private readonly imageService = inject(ImagesUrlService);

  private readonly lang = toSignal(this.transloco.langChanges$);
  protected readonly img = computed(() => this.imageService.getUrl(`title/${this.lang() ?? 'en'}`));
}
