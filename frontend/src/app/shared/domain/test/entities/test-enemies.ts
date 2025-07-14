import { Enemy } from '../../entities/enemy.model';
import { enemyId } from '../../entities/id.model';

export const testEnemy: Enemy = {
  id: enemyId.assert('1119'),
  cardType: 'enemy',
  setInfo: {
    set: '01',
    index: '119',
  },
  fight: 3,
  evade: 4,
  damageAttack: 2,
  horrorAttack: 1,
  health: {
    max: 4,
    damaged: 0,
  },
  isMassive: false,
};

export const testEnemy2: Enemy = {
  ...testEnemy,
  id: enemyId.assert('1118'),
  health: { max: 5, damaged: 3 },
};

export const testMassiveEnemy: Enemy = {
  ...testEnemy,
  id: enemyId.assert('1117'),
  health: { max: 25, damaged: 9 },
  isMassive: true,
};
