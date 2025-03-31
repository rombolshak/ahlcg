import { gameCard } from './card.model';
import { health, sanity } from './vitals.model';
import { type } from 'arktype';

export const playerCardType = type("'asset' | 'skill' | 'event'");
export type PlayerCardType = typeof playerCardType.infer;

export const playerCardClass = type(
  "'neutral' | 'guardian' | 'seeker' | 'rogue' | 'survivor' | 'mystic'",
);
export type PlayerCardClassType = typeof playerCardClass.infer;

export const skills = type({
  willpower: 'number',
  intellect: 'number',
  combat: 'number',
  agility: 'number',
  wild: 'number',
});

export const skillType = skills.keyof();
export type SkillType = typeof skillType.infer;

export const playerCardBase = gameCard.and({
  playerCardType,
  class: playerCardClass,
  skills: skills.partial(),
});
export type PlayerCardBase = typeof playerCardBase.infer;

const cost = type('number');

export const assetSlot = type(
  "'accessory' | 'body' | 'ally' | 'hand' | 'two-hands' | 'arcane' | 'two-arcane' | 'tarot'",
);
export type AssetSlot = typeof assetSlot.infer;

export const assetCard = playerCardBase.and({
  playerCardType: "'asset'",
  'slot?': assetSlot,
  'additionalSlot?': assetSlot,
  'health?': health,
  'sanity?': sanity,
  cost,
});
export type AssetCard = typeof assetCard.infer;

export const eventCard = playerCardBase.and({
  playerCardType: "'event'",
  cost,
});
export type EventCard = typeof eventCard.infer;

export const skillCard = playerCardBase.and({
  playerCardType: "'skill'",
});
export type SkillCard = typeof skillCard.infer;

export const playerCard = assetCard.or(eventCard).or(skillCard);
export type PlayerCard = typeof playerCard.infer;
