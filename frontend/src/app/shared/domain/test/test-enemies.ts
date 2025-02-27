import { Enemy } from '../enemy.model';
import { CardType } from '../card-info.model';

export const testEnemy: Enemy = {
  cardType: CardType.Enemy,
  setInfo: {
    set: '01',
    index: '119',
  },
  id: '01119',
  title: 'Ледяной упырь',
  traits: [
    { key: 'Humanoid', displayValue: 'Гуманоид' },
    { key: 'Monster', displayValue: 'Монстр' },
    {
      key: 'Ghoul',
      displayValue: 'Упырь',
    },
  ],
  abilities: ['<b>Выходит —</b> в "Подвал"'],
  flavor:
    'Огромный зверь вырывается изо льда в подземелье под домом. Тварь покрыта толстым слоем инея, и в морозном воздухе видно её дыхание.',
  copyright: { ffg: '2016', illustrator: 'Chun Lo' },
  fight: 3,
  evade: 4,
  damageAttack: 2,
  horrorAttack: 1,
  health: 4,
  isMassive: false,
};
