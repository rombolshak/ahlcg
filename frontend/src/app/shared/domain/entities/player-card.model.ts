/* eslint-disable @typescript-eslint/no-empty-object-type */
import { gameCard } from './card.model';
import { health, sanity } from './details/vitals.model';
import { type } from 'arktype';
import { assetId, eventId, skillId } from './id.model';
import { GameEntity } from '../game-state';

export const playerCardClass = type(
  "'neutral' | 'guardian' | 'seeker' | 'rogue' | 'survivor' | 'mystic'",
);
export type PlayerCardClassType = typeof playerCardClass.infer;

export const skills = type({
  willpower: 'number.integer >= 0',
  intellect: 'number.integer >= 0',
  combat: 'number.integer >= 0',
  agility: 'number.integer >= 0',
  wild: 'number.integer >= 0',
});

export const skillType = skills.keyof();
export type SkillType = typeof skillType.infer;

export const playerCardBase = gameCard.and({
  class: playerCardClass,
  skills: skills.partial(),
});
export type PlayerCardBase = typeof playerCardBase.infer;

const cost = type('number');

export const assetSlot = type(
  "'accessory' | 'body' | 'ally' | 'hand' | 'two-hands' | 'arcane' | 'two-arcane' | 'tarot'",
);
export type AssetSlot = typeof assetSlot.infer;

const _assetCard = playerCardBase.and({
  id: assetId,
  type: "'asset'",
  'slot?': assetSlot,
  'additionalSlot?': assetSlot,
  'health?': health,
  'sanity?': sanity,
  cost,
});
type _AssetCard = typeof _assetCard.infer;

export interface AssetCard extends _AssetCard {}

export const assetCard: type<AssetCard> = _assetCard;

const _eventCard = playerCardBase.and({
  id: eventId,
  type: "'event'",
  cost,
});
type _EventCard = typeof _eventCard.infer;

export interface EventCard extends _EventCard {}

export const eventCard: type<EventCard> = _eventCard;

const _skillCard = playerCardBase.and({
  id: skillId,
  type: "'skill'",
});
type _SkillCard = typeof _skillCard.infer;

export interface SkillCard extends _SkillCard {}

export const skillCard: type<SkillCard> = _skillCard;

export const playerCard = assetCard.or(eventCard).or(skillCard);
export type PlayerCard = typeof playerCard.infer;

export function isAsset(entity: GameEntity): entity is AssetCard {
  return entity.type === 'asset';
}

export function isSkill(entity: GameEntity): entity is SkillCard {
  return entity.type === 'skill';
}

export function isEvent(entity: GameEntity): entity is EventCard {
  return entity.type === 'event';
}

export function isPlayerCard(entity: GameEntity): entity is PlayerCard {
  return isAsset(entity) || isSkill(entity) || isEvent(entity);
}
