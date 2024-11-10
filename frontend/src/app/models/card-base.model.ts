export enum CardType {
  Player = 'player'
}

export interface CardBase {
  cardType: CardType;
  title: string;
  subtitle?: string;
  copyright: {
    illustrator: string;
    ffg: string;
  },
  setInfo: SetInfo
}

export type SetInfo = {
  set: string;
  index: string;
}
