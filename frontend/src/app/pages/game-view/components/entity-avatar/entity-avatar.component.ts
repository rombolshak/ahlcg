import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { CardOutlineDirective } from 'shared/ui/directives/card-outline.directive';
import { NgOptimizedImage } from '@angular/common';
import { VitalsBarComponent } from 'shared/ui/components/vitals-bar/vitals-bar.component';
import { InvestigatorModel } from 'shared/domain/player-card.model';
import { AssetState } from 'shared/domain/asset.state';
import { ImagesUrlService } from 'shared/services/images-url.service';

@Component({
  selector: 'ah-entity-avatar',
  imports: [CardOutlineDirective, NgOptimizedImage, VitalsBarComponent],
  templateUrl: './entity-avatar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityAvatarComponent {
  readonly investigator = input.required<InvestigatorModel>();
  readonly state = input<AssetState>({});

  protected readonly imagesService = inject(ImagesUrlService);
}
