import { Enemy } from '../enemy.model';

export const testEnemy: Enemy = {
  id: 1119,
  info: {
    cardType: 'enemy',
    setInfo: {
      set: '01',
      index: '119',
    },
    title: 'Ледяной упырь',
    traits: ['Гуманоид', 'Монстр', 'Упырь'],
    abilities: ['<b>Выходит —</b> в "Подвал"'],
    flavor:
      'Огромный зверь вырывается изо льда в подземелье под домом. Тварь покрыта толстым слоем инея, и в морозном воздухе видно её дыхание.',
    copyright: { ffg: '2016', illustrator: 'Chun Lo' },
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
