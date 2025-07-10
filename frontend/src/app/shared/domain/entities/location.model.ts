import { type } from 'arktype';
import { gameCard } from './card.model';
import { locationId } from './id.model';

const _location = gameCard.and({
  id: locationId,
  cardType: "'location'",
  shroud: 'number.integer >= 0',
  clues: 'number.integer >= 0',
  color: 'string',
});

type _Location = typeof _location.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface Location extends _Location {}

export const location: type<Location> = _location;
