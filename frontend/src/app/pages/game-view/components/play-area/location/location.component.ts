import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { NgOptimizedImage } from '@angular/common';
import { Location } from 'shared/domain/location.model';
import { LocationHeaderComponent } from './location-header/location-header.component';
import { InvestigatorWithState } from 'shared/domain/player-card.model';
import { EntityAvatarComponent } from '../../entity-avatar/entity-avatar.component';

@Component({
  selector: 'ah-location',
  imports: [NgOptimizedImage, LocationHeaderComponent, EntityAvatarComponent],
  templateUrl: './location.component.html',
  host: {
    class: 'flex flex-col rounded-3xl outline outline-2 outline-zinc-400',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationComponent {
  imageService = inject(ImagesUrlService);
  readonly location = input.required<Location>();
  readonly investigators = input.required<InvestigatorWithState[]>();
}
