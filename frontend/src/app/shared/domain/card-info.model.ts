import { type } from 'arktype';

const setInfo = type({
  set: 'string',
  index: 'string',
});

export type SetInfo = typeof setInfo.infer;

const cardType = type("'act' | 'agenda' | 'location' | 'player' | 'enemy'");
export type CardType = typeof cardType.infer;

const _cardInfo = type({
  cardType,
  title: 'string',
  'subtitle?': 'string',
  'flavor?': 'string',
  'traits?': 'string[]',
  abilities: 'string[]',
  copyright: {
    illustrator: 'string',
    ffg: 'string',
  },
  setInfo: setInfo,
});
export type _CardInfo = typeof _cardInfo.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface CardInfo extends _CardInfo {}

export const cardInfo: type<CardInfo> = _cardInfo;
