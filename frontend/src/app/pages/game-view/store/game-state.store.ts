import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { GameEntity, gameState, GameState } from 'shared/domain/game-state';
import {
  addEntities,
  removeEntity,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Act, isAct } from 'shared/domain/entities/act.model';
import { Enemy, isEnemy } from 'shared/domain/entities/enemy.model';
import {
  Investigator,
  isInvestigator,
} from 'shared/domain/entities/investigator.model';
import { Agenda, isAgenda } from 'shared/domain/entities/agenda.model';
import { isLocation, Location } from 'shared/domain/entities/location.model';
import {
  AssetCard,
  EventCard,
  isAsset,
  isEvent,
  isPlayerCard,
  isSkill,
  PlayerCard,
  SkillCard,
} from 'shared/domain/entities/player-card.model';
import {
  ActId,
  AgendaId,
  AssetId,
  EnemyId,
  EntityId,
  EventId,
  InvestigatorId,
  LocationId,
  PlayerCardId,
  SkillId,
} from 'shared/domain/entities/id.model';
import { computed } from '@angular/core';
import { ArkErrors } from 'arktype';

interface State {
  isLoading: boolean;
  error: string | null;
  state: GameState | null;
}

export const GameStateStore = signalStore(
  { providedIn: 'root' },
  withState<State>({ isLoading: true, error: null, state: null }),
  withEntities<GameEntity>(),

  withProps((store) => ({
    getEntity<T extends GameEntity>(
      id: EntityId,
      guard: (entity: GameEntity) => entity is T,
    ): T {
      const model = store.entityMap()[id];
      if (!model) {
        throw new Error(`Entity '${id}' not found`);
      }

      if (!guard(model)) {
        throw new Error(`Entity '${id}' is '${model.type}' type`);
      }

      return model;
    },
    getAct(id: ActId): Act {
      return this.getEntity<Act>(id, isAct);
    },
    getAgenda(id: AgendaId): Agenda {
      return this.getEntity<Agenda>(id, isAgenda);
    },
    getLocation(id: LocationId): Location {
      return this.getEntity<Location>(id, isLocation);
    },
    getInvestigator(id: InvestigatorId): Investigator {
      return this.getEntity<Investigator>(id, isInvestigator);
    },
    getAsset(id: AssetId): AssetCard {
      return this.getEntity<AssetCard>(id, isAsset);
    },
    getSkill(id: SkillId): SkillCard {
      return this.getEntity<SkillCard>(id, isSkill);
    },
    getEvent(id: EventId): EventCard {
      return this.getEntity<EventCard>(id, isEvent);
    },
    getPlayerCard(id: PlayerCardId): PlayerCard {
      return this.getEntity<PlayerCard>(id, isPlayerCard);
    },
    getEnemy(id: EnemyId): Enemy {
      return this.getEntity<Enemy>(id, isEnemy);
    },
  })),
  withComputed((store) => ({
    currentInvestigator: computed(() => {
      if (!store.state()) return null;
      // eslint-disable-next-line
      const id = store.state()!.currentInvestigator;
      return store.getInvestigator(id);
    }),
  })),
  withMethods((store) => ({
    addEntities(entities: GameEntity[]): void {
      patchState(store, addEntities(entities));
    },
    updateEntity(id: EntityId, changes: Partial<GameEntity>): void {
      patchState(store, updateEntity({ id, changes }));
    },
    removeEntity(id: EntityId): void {
      patchState(store, removeEntity(id));
    },
    updateState(changes: Partial<GameState>): void {
      patchState(store, (oldState) => {
        const newState = { ...oldState.state, ...changes };
        const model = gameState(newState);
        if (model instanceof ArkErrors) {
          model.throw();
          return {};
        }

        return { state: model, isLoading: false, error: null };
      });
    },
  })),
);
