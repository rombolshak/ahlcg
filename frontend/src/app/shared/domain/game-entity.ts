import { Act, act } from './entities/act.model';
import { Agenda, agenda } from './entities/agenda.model';
import { Enemy, enemy } from './entities/enemy.model';
import { Investigator, investigator } from './entities/investigator.model';
import { Location, location } from './entities/location.model';
import {
  AssetCard,
  EventCard,
  PlayerCard,
  playerCard,
  SkillCard,
} from './entities/player-card.model';

export const gameEntity = act
  .or(agenda)
  .or(enemy)
  .or(location)
  .or(investigator)
  .or(playerCard);
export type GameEntity = typeof gameEntity.infer;

export function isAct(entity: GameEntity): entity is Act {
  return entity.cardType === 'act';
}

export function isAgenda(entity: GameEntity): entity is Agenda {
  return entity.cardType === 'agenda';
}

export function isEnemy(entity: GameEntity): entity is Enemy {
  return entity.cardType === 'enemy';
}

export function isLocation(entity: GameEntity): entity is Location {
  return entity.cardType === 'location';
}

export function isInvestigator(entity: GameEntity): entity is Investigator {
  return entity.cardType === 'investigator';
}

export function isAsset(entity: GameEntity): entity is AssetCard {
  return entity.cardType === 'asset';
}

export function isSkill(entity: GameEntity): entity is SkillCard {
  return entity.cardType === 'skill';
}

export function isEvent(entity: GameEntity): entity is EventCard {
  return entity.cardType === 'event';
}

export function isPlayerCard(entity: GameEntity): entity is PlayerCard {
  return isAsset(entity) || isSkill(entity) || isEvent(entity);
}
