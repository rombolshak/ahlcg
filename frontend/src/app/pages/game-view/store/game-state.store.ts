import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { GameEntity, gameState, GameState } from 'shared/domain/game-state';
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
import { applyPatch, Operation } from 'rfc6902';
import { produce } from 'immer';

interface State {
  isLoading: boolean;
  error: string | null;
  gameState: GameState | null;
}

export const GameStateStore = signalStore(
  { providedIn: 'root' },
  withState<State>({ isLoading: true, error: null, gameState: null }),

  withProps((store) => ({
    getEntity<T extends GameEntity>(
      id: EntityId,
      guard: (entity: GameEntity) => entity is T,
    ): T {
      const model = store.gameState()?.gameEntities[id];
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
    validateState(state: GameState | null): void {
      const model = gameState(state);
      if (model instanceof ArkErrors) {
        model.throw();
      }
    },
  })),
  withComputed((store) => ({
    currentInvestigator: computed(() => {
      if (!store.gameState()) return null;
      // eslint-disable-next-line
      const id = store.gameState()!.currentInvestigator;
      return store.getInvestigator(id);
    }),
  })),
  withMethods((store) => ({
    setState(state: GameState): void {
      patchState(store, () => {
        return { isLoading: false, gameState: state };
      });
    },
    updateState(changes: Operation[]): void {
      patchState(store, (oldState) => {
        let newState: GameState | null;
        if (
          oldState.gameState === null &&
          changes.length === 1 &&
          changes[0]?.op === 'replace' &&
          changes[0].path === ''
        ) {
          newState = changes[0].value as GameState;
        } else
          newState = produce(oldState.gameState, (draft) => {
            const results = applyPatch(draft, changes);
            const errors = results.filter((r) => r !== null);
            if (errors.length > 0) {
              throw new Error(
                'Error applying changes to game state: ' +
                  errors.map((e) => e.message).join('; '),
              );
            }
          });

        store.validateState(newState);
        return { gameState: newState };
      });
    },
  })),
);
