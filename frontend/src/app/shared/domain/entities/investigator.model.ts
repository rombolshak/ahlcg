import { type } from 'arktype';
import { gameCard } from './card.model';
import { health, sanity } from './details/vitals.model';
import { assetId, enemyId, investigatorId, playerCardId } from './id.model';
import { faction, skills } from './player-card.model';

const _investigator = gameCard.and({
  id: investigatorId,
  cardType: "'investigator'",
  health,
  sanity,
  skills: skills.omit('wild'),
  faction,
  threatArea: enemyId.array(),
  hand: playerCardId.array(),
  controlledAssets: assetId.array(),
});

type _Investigator = typeof _investigator.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface Investigator extends _Investigator {}

export const investigator: type<Investigator> = _investigator;
