import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { imageUrl } from '@domain/card-art/image-url';
import { InvestigatorId, LocationId } from '@domain/entities/id.model';
import { GameStateStore } from '../../store/game-state.store';
import { EnemyAvatarComponent } from './enemy-avatar/enemy-avatar.component';
import { InvestigatorAvatarComponent } from './investigator-avatar/investigator-avatar.component';
import { LocationHeaderComponent } from './location-header/location-header.component';

@Component({
  selector: 'ah-location',
  imports: [NgOptimizedImage, LocationHeaderComponent, InvestigatorAvatarComponent, EnemyAvatarComponent],
  templateUrl: './location.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col rounded-xl outline-2 outline-zinc-400 relative',
  },
})
export class LocationComponent {
  readonly store = inject(GameStateStore);
  protected readonly imageUrl = imageUrl;

  readonly locationId = input.required<LocationId>();
  readonly investigatorsIds = input.required<InvestigatorId[]>();

  protected readonly location = computed(() => this.store.getLocation(this.locationId()));

  protected readonly investigators = computed(() => this.investigatorsIds().map(id => this.store.getInvestigator(id)));
}
