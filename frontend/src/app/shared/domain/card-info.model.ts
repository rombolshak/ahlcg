export enum CardType {
  Player = 'player',
  Location = 'location',
  Enemy = 'enemy',
  Agenda = 'agenda',
  Act = 'act',
}

interface CardTrait {
  key: string;
  displayValue: string;
}

export interface CardInfo {
  id: string;
  cardType: CardType;
  title: string;
  subtitle?: string;
  traits: CardTrait[];
  abilities: string[];
  flavor?: string;
  copyright: {
    illustrator: string;
    ffg: string;
  };
  setInfo: SetInfo;
}

export interface SetInfo {
  set: string;
  index: string;
}
