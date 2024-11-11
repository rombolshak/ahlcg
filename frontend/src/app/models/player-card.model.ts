import { CardBase, CardType } from './card-base.model';

export enum PlayerCardType {
  Asset = 'Asset',
  Skill = 'Skill',
  Event = 'Event',
}

export enum PlayerCardClass {
  Neutral = 'Neutral',
  Guardian = 'Guardian',
  Seeker = 'Seeker',
  Rogue = 'Rogue',
  Survivor = 'Survivor',
  Mystic = 'Mystic',
  Weakness = 'Weakness',
  BasicWeakness = 'BasicWeakness',
}

export enum SkillType {
  Willpower = 'Willpower',
  Intellect = 'Intellect',
  Combat = 'Combat',
  Agility = 'Agility',
  Wild = 'Wild',
}

export enum AssetSlot {
  Accessory = 'Accessory',
  Body = 'Body',
  Ally = 'Ally',
  Hand = 'Hand',
  TwoHands = 'TwoHands',
  Arcane = 'Arcane',
  TwoArcane = 'TwoArcane',
  Tarot = 'Tarot',
}

interface CardTrait {
  key: string;
  displayValue: string;
}

export interface PlayerCardBase extends CardBase {
  cardType: CardType.Player;
  playerCardType: PlayerCardType;
  class: PlayerCardClass;
  skills: SkillType[];
  traits: CardTrait[];
  abilities: string[];
}

export type WithCost = { cost: number }

export type AssetCard = PlayerCardBase & WithCost & {
  playerCardType: PlayerCardType.Asset;
  slot?: AssetSlot;
  additionalSlot?: AssetSlot;
}

export type EventCard = PlayerCardBase & WithCost & {
  playerCardType: PlayerCardType.Event;
}

export type SkillCard = PlayerCardBase & {
  playerCardType: PlayerCardType.Skill;
}
