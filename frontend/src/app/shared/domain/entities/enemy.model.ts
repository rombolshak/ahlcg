import { type } from 'arktype';
import { gameCard } from './card.model';
import { health } from './details/vitals.model';
import { enemyId } from './id.model';

const _enemy = gameCard.and({
  id: enemyId,
  type: "'enemy'",
  health,
  fight: 'number.integer >= 0',
  evade: 'number.integer >= 0',
  damageAttack: 'number.integer >= 0',
  horrorAttack: 'number.integer >= 0',
  isMassive: 'boolean',
});

type _Enemy = typeof _enemy.t;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface Enemy extends _Enemy {}

export const enemy: type<Enemy> = _enemy;
