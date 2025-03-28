import { gameCard } from './card.model';
import { enemy } from './enemy.model';
import {
  assetCard,
  playerCard,
  playerCardClass,
  skills,
} from './player-card.model';
import { health, sanity } from './vitals.model';
import { type } from 'arktype';

const _investigator = gameCard.and({
  health,
  sanity,
  skills: skills.omit('wild'),
  class: playerCardClass,
  threatArea: enemy.array(),
  hand: playerCard.array(),
  controlledAssets: assetCard.array(),
});

type _Investigator = typeof _investigator.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
interface Investigator extends _Investigator {}

export const investigator: type<Investigator> = _investigator;
