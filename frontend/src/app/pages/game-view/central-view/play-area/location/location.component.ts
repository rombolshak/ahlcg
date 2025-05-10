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
import { InvestigatorAvatarComponent } from '../../../components/investigator-avatar/investigator-avatar.component';
import { EnemyAvatarComponent } from '../../../components/enemy-avatar/enemy-avatar.component';
import {
  EnemiesStore,
  InvestigatorsStore,
  LocationsStore,
} from '../../../store/store';
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
  host: {
    class: 'flex flex-col rounded-3xl outline-2 outline-zinc-400 relative',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationComponent {
  imageService = inject(ImagesUrlService);
  readonly locationId = input.required<LocationId>();
  readonly investigatorsIds = input.required<InvestigatorId[]>();

  private readonly locationStore = inject(LocationsStore);
  private readonly investigatorStore = inject(InvestigatorsStore);
  readonly enemyStore = inject(EnemiesStore);

  protected readonly location = computed(
    () => this.locationStore.entityMap()[this.locationId()],
  );

  protected readonly investigators = computed(() =>
    this.investigatorsIds()
      .map((id) => this.investigatorStore.entityMap()[id])
      .filter((i) => !!i),
  );
}
