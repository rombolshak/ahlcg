import { type } from 'arktype';

const _cardTokens = type({
  'clue?': 'number',
  'doom?': 'number',
  'resource?': 'number',
});
type _CardTokens = typeof _cardTokens.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface CardTokens extends _CardTokens {}

export const cardTokens: type<CardTokens> = _cardTokens;

export const tokenType = cardTokens.keyof();
export type TokenType = typeof tokenType.infer;
