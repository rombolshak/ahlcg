import { cardInfo } from './card-info.model';
import { type } from 'arktype';
import { cardTokens } from './card.tokens';

export const gameCard = type({
  id: 'number.integer > 0',
  info: cardInfo,
  'tokens?': cardTokens,
});

export const gameCardWithoutTraits = gameCard.omit('info').and({
  info: cardInfo.omit('traits'),
});

export type GameCard = typeof gameCard.infer;
