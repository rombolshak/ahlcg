import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CardInfoService } from '@core/card-info.service';
import { imageUrl } from '@domain/card-art/image-url';
import { Location } from '@domain/entities/location.model';
import { TranslocoPipe } from '@jsverse/transloco';
import { NumericTextWithOverlayComponent } from '@ui/components/numeric-text/numeric-text-with-overlay.component';
import { NumericTextComponent } from '@ui/components/numeric-text/numeric-text.component';
import { WithAhSymbolsPipe } from '@ui/pipes/with-ah-symbols.pipe';
import { CardDetailsTextComponent } from '../../../components/card-details-text/card-details-text.component';

@Component({
  selector: 'ah-location-header',
  imports: [CardDetailsTextComponent, NgOptimizedImage, NumericTextComponent, NumericTextWithOverlayComponent, TranslocoPipe, WithAhSymbolsPipe],
  templateUrl: './location-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex items-center justify-between flex-row-reverse w-full bg-linear-to-b from-zinc-50 via-zinc-100 h-16 rounded-t-xl z-0 text-neutral-900',
  },
})
export class LocationHeaderComponent {
  private readonly cardInfoService = inject(CardInfoService);
  protected readonly imageUrl = imageUrl;

  readonly location = input<Location>();
  readonly hovered = input(false);

  private readonly cardInfo = this.cardInfoService.getCardInfo(this.location);

  protected readonly title = computed(() => this.cardInfo()?.title);
  protected readonly showAbilitiesMark = computed(() => (this.cardInfo()?.abilities?.length ?? 0) > 0);
}
