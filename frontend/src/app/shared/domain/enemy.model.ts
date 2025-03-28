import { type } from 'arktype';
import { gameCard } from './card.model';
import { health } from './vitals.model';

const _enemy = gameCard.and({
  health,
  fight: 'number',
  evade: 'number',
  damageAttack: 'number',
  horrorAttack: 'number',
  isMassive: 'boolean',
});

type _Enemy = typeof _enemy.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface Enemy extends _Enemy {}

export const enemy: type<Enemy> = _enemy;
