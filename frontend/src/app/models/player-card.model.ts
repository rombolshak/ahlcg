export enum PlayerCardType {
  Asset = 'Asset',
  Skill = 'Skill',
  Event = 'Event',
}

export enum CardClass {
  Neutral = 'Neutral',
  Guardian = 'Guardian',
  Seeker = 'Seeker',
  Rogue = 'Rogue',
  Survivor = 'Survivor',
  Mystic = 'Mystic',
}

export enum SkillType {
  Willpower = 'Willpower',
  Intellect = 'Intellect',
  Combat = 'Combat',
  Agility = 'Agility',
  Wild = 'Wild',
}

export enum CardSlot {
  Accessory = 'Accessory',
  Body = 'Body',
  Ally = 'Ally',
  Hand = 'Hand',
  TwoHands = 'TwoHands',
  Arcane = 'Arcane',
  TwoArcane = 'TwoArcane',
  Tarot = 'Tarot',
}

export interface CardTrait {
  key: string;
  displayValue: string;
}

export enum CardAbilityType {
  Permanent,
  Action,
  Reaction,
  FreeAction,
}

export interface CardAbility {
  type: CardAbilityType;
  text: string;
}

export interface CollectionInfo {
  set: string;
  index: string;
}

export interface PlayerCard {
  type: PlayerCardType;
  cost: number;
  title: string;
  class: CardClass;
  skills: SkillType[];
  traits: CardTrait[];
  abilities: CardAbility[];
  slot: CardSlot;
  additionalSlot?: CardSlot;
  copyright: {
    illustrator: string;
    ffg: string;
  },
  collection: CollectionInfo
}
