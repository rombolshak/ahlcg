import { computed, inject, Injectable } from '@angular/core';
import { AssetsStore, EventsStore, SkillsStore } from './store';

@Injectable({ providedIn: 'root' })
export class PlayerCardStore {
  private readonly assets = inject(AssetsStore);
  private readonly skills = inject(SkillsStore);
  private readonly events = inject(EventsStore);

  public readonly entities = computed(() => {
    return [
      ...this.assets.entities(),
      ...this.skills.entities(),
      ...this.events.entities(),
    ];
  });

  public readonly entityMap = computed(() => {
    return {
      ...this.assets.entityMap(),
      ...this.skills.entityMap(),
      ...this.events.entityMap(),
    };
  });

  public readonly ids = computed(() => {
    return [...this.assets.ids(), ...this.skills.ids(), ...this.events.ids()];
  });
}
