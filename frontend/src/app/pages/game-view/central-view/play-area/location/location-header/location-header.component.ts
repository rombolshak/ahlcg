import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { CardDetailsTextComponent } from '../../../../components/card-details-text/card-details-text.component';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { Location } from 'shared/domain/entities/location.model';
import { NgOptimizedImage } from '@angular/common';
import { NumericTextComponent } from 'shared/ui/components/numeric-text/numeric-text.component';
import { NumericTextWithOverlayComponent } from 'shared/ui/components/numeric-text/numeric-text-with-overlay.component';
import { CardInfoService } from '../../../../../../shared/services/card-info.service';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'ah-location-header',
  imports: [
    CardDetailsTextComponent,
    NgOptimizedImage,
    NumericTextComponent,
    NumericTextWithOverlayComponent,
    TranslocoPipe,
  ],
  templateUrl: './location-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex items-center justify-between flex-row-reverse w-full bg-linear-to-b from-zinc-50 via-zinc-100 h-16 rounded-t-3xl z-0',
  },
})
export class LocationHeaderComponent {
  readonly location = input<Location>();
  readonly imageService = inject(ImagesUrlService);

  private readonly cardInfo = inject(CardInfoService).getCardInfo(
    this.location,
  );
  readonly title = computed(() => this.cardInfo()?.title);
}
