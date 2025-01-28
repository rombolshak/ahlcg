export enum CardType {
  Player = 'player',
  Location = 'location',
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

export interface SetInfo {
  set: string;
  index: string;
}
