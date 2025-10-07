/* eslint-disable @typescript-eslint/no-empty-object-type */
import { type } from 'arktype';
import { gameCard } from './card.model';
import { health, sanity } from './details/vitals.model';
import { assetId, eventId, skillId } from './id.model';

export const faction = type(
  "'neutral' | 'guardian' | 'seeker' | 'rogue' | 'survivor' | 'mystic'",
);
export type Faction = typeof faction.infer;

export const skills = type({
  willpower: 'number.integer >= 0',
  intellect: 'number.integer >= 0',
  combat: 'number.integer >= 0',
  agility: 'number.integer >= 0',
  wild: 'number.integer >= 0',
});

export const skillType = skills.keyof();
export type SkillType = typeof skillType.infer;

export const playerCardType = type(
  "'asset' | 'skill' | 'event' | 'investigator'",
);
export type PlayerCardType = typeof playerCardType.infer;

export const playerCardBase = gameCard.and({
  cardType: playerCardType,
  faction,
  skills: skills.partial(),
});
export type PlayerCardBase = typeof playerCardBase.infer;

const cost = type('number');

export const AssetSlots = [
  'accessory',
  'body',
  'ally',
  'hand',
  'two-hands',
  'arcane',
  'two-arcane',
  'tarot',
] as const;

export const assetSlot = type.enumerated(...AssetSlots);
export type AssetSlot = typeof assetSlot.infer;

export const slotsCount = type.Record(
  assetSlot.exclude("'two-hands' | 'two-arcane'"),
  'number',
);
export type SlotsCount = typeof slotsCount.infer;

const _assetCard = playerCardBase.and({
  id: assetId,
  cardType: "'asset'",
  hasAction: 'boolean',
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
  cardType: "'event'",
  cost,
});
type _EventCard = typeof _eventCard.infer;

export interface EventCard extends _EventCard {}

export const eventCard: type<EventCard> = _eventCard;

const _skillCard = playerCardBase.and({
  id: skillId,
  cardType: "'skill'",
});
type _SkillCard = typeof _skillCard.infer;

export interface SkillCard extends _SkillCard {}

export const skillCard: type<SkillCard> = _skillCard;

export const playerCard = assetCard.or(eventCard).or(skillCard);
export type PlayerCard = typeof playerCard.infer;
