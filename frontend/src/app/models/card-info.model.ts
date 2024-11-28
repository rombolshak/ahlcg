export enum CardType {
  Player = 'player',
  Investigator = 'investigator',
}

export interface CardInfo {
  id: string;
  cardType: CardType;
  title: string;
  subtitle?: string;
  flavor?: string;
  copyright: {
    illustrator: string;
    ffg: string;
  };
  setInfo: SetInfo;
}

export type SetInfo = {
  set: string;
  index: string;
};
