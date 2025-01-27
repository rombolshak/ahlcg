import { CardInfo, CardType } from './card-info.model';

export enum PlayerCardType {
  Asset = 'Asset',
  Skill = 'Skill',
  Event = 'Event',
  Investigator = 'Investigator',
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

export interface PlayerCardBase extends CardInfo {
  cardType: CardType.Player;
  playerCardType: PlayerCardType;
  class: PlayerCardClass;
  skills: Map<SkillType, number>;
  traits: CardTrait[];
  abilities: string[];
}

export interface WithCost {
  cost: number;
}

export interface WithHealth {
  health: number;
  sanity: number;
}

export type AssetCard = PlayerCardBase &
  WithCost &
  Partial<WithHealth> & {
    playerCardType: PlayerCardType.Asset;
    slot?: AssetSlot | undefined;
    additionalSlot?: AssetSlot | undefined;
  };

export type EventCard = PlayerCardBase &
  WithCost & {
    playerCardType: PlayerCardType.Event;
  };

export type SkillCard = PlayerCardBase & {
  playerCardType: PlayerCardType.Skill;
};

export type InvestigatorModel = PlayerCardBase &
  WithHealth & {
    playerCardType: PlayerCardType.Investigator;
  };
