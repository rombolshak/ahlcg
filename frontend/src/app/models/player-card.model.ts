export enum PlayerCardType {
  Asset,
  Skill,
  Event,
}

export enum CardClass {
  Neutral,
  Guardian,
  Seeker,
  Rogue,
  Survivor,
  Mystic,
}

export enum SkillType {
  Willpower,
  Intellect,
  Combat,
  Agility,
}

export enum CardSlot {
  Accessory,
  Body,
  Ally,
  Hand,
  TwoHand,
  Arcane,
  TwoArcane,
  Taro,
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

export interface PlayerCard {
  type: PlayerCardType;
  cost: number;
  title: string;
  class: CardClass;
  skills: SkillType[];
  traits: CardTrait[];
  abilities: CardAbility[];
  slots: CardSlot[];
  copyright: {
    illustrator: string;
    ffg: string;
  },
  collection: {
    set: string;
    index: string;
  }
}
