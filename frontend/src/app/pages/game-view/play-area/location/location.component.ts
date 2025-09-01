import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { NgOptimizedImage } from '@angular/common';
import { LocationHeaderComponent } from './location-header/location-header.component';
import { InvestigatorAvatarComponent } from '../../components/investigator-avatar/investigator-avatar.component';
import { EnemyAvatarComponent } from '../../components/enemy-avatar/enemy-avatar.component';
import { GameStateStore } from '../../store/game-state.store';
import { InvestigatorId, LocationId } from 'shared/domain/entities/id.model';

@Component({
  selector: 'ah-location',
  imports: [
    NgOptimizedImage,
    LocationHeaderComponent,
    InvestigatorAvatarComponent,
    EnemyAvatarComponent,
  ],
  templateUrl: './location.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col rounded-3xl outline-2 outline-zinc-400 relative',
  },
})
export class LocationComponent {
  imageService = inject(ImagesUrlService);
  readonly locationId = input.required<LocationId>();
  readonly investigatorsIds = input.required<InvestigatorId[]>();

  readonly store = inject(GameStateStore);

  protected readonly location = computed(() =>
    this.store.getLocation(this.locationId()),
  );

  protected readonly investigators = computed(() =>
    this.investigatorsIds().map((id) => this.store.getInvestigator(id)),
  );
}
