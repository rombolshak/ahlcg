import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { InvestigatorId, LocationId } from 'shared/domain/entities/id.model';
import { ImagesUrlService } from 'shared/services/images-url.service';
import { EnemyAvatarComponent } from '../../components/enemy-avatar/enemy-avatar.component';
import { InvestigatorAvatarComponent } from '../../components/investigator-avatar/investigator-avatar.component';
import { GameStateStore } from '../../store/game-state.store';
import { LocationHeaderComponent } from './location-header/location-header.component';

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
    class: 'flex flex-col rounded-xl outline-2 outline-zinc-400 relative',
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
