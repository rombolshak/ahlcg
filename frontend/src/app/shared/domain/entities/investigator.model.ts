import { gameCard } from './card.model';
import { playerCardClass, skills } from './player-card.model';
import { health, sanity } from './details/vitals.model';
import { type } from 'arktype';
import { assetId, enemyId, investigatorId, playerCardId } from './id.model';

const _investigator = gameCard.and({
  id: investigatorId,
  type: "'investigator'",
  health,
  sanity,
  skills: skills.omit('wild'),
  class: playerCardClass,
  threatArea: enemyId.array(),
  hand: playerCardId.array(),
  controlledAssets: assetId.array(),
});

type _Investigator = typeof _investigator.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface Investigator extends _Investigator {}

export const investigator: type<Investigator> = _investigator;
