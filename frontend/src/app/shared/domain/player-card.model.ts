import { AssetState } from './asset.state';
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

export interface PlayerCardBase extends CardInfo {
  cardType: CardType.Player;
  playerCardType: PlayerCardType;
  class: PlayerCardClass;
  skills: Map<SkillType, number>;
}

export interface WithCost {
  cost: number;
}

export interface WithHealth {
  health: number;
  sanity: number;
}

export interface AssetCard
  extends PlayerCardBase,
    WithCost,
    Partial<WithHealth> {
  playerCardType: PlayerCardType.Asset;
  slot?: AssetSlot | undefined;
  additionalSlot?: AssetSlot | undefined;
}

export interface EventCard extends PlayerCardBase, WithCost {
  playerCardType: PlayerCardType.Event;
}

export interface SkillCard extends PlayerCardBase {
  playerCardType: PlayerCardType.Skill;
}

export interface InvestigatorModel extends PlayerCardBase, WithHealth {
  playerCardType: PlayerCardType.Investigator;
}

export interface InvestigatorWithState extends InvestigatorModel, AssetState {}
