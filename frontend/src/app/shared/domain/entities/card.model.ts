import { type } from 'arktype';
import { setInfo } from './details/card-info.model';
import { cardTokens } from './details/card.tokens';
import { entityId } from './id.model';

export const cardType = type(
  "'act' | 'agenda' | 'location' | 'investigator' | 'asset' | 'skill' | 'event' | 'enemy'",
);
export type CardType = typeof cardType.infer;

export const gameCard = type({
  id: entityId,
  cardType,
  setInfo,
  'tokens?': cardTokens,
});

export type GameCard = typeof gameCard.infer;
