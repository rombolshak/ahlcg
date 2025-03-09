import { Act } from '../act.model';
import { CardType } from '../card-info.model';

export const testAct: Act = {
  id: '02200',
  title: 'Обиталище Зверя',
  cardType: CardType.Act,
  flavor:
    'Жалкая тварь пытается схватить вас скользкими руками, её челюсти клацают от голода. Убить существо было бы милосердием. Но возможно, вам стоит побольше узнать об этом чудовище…',
  traits: [],
  abilities: [],
  setInfo: {
    set: '02',
    index: '200',
  },
  copyright: {
    illustrator: 'Jeff Lee Johnson',
    ffg: '2016',
  },

  stage: 2,
  objectives: [
    {
      description: '<b>Цель —</b> Если «Сайлас Бишоп» побеждён, (→<b>И1</b>).',
      requiredValue: 0,
      currentValue: 18,
      startValue: 18,
      type: 'health',
    },
    {
      description:
        '<b>Цель —</b> Если в «Тайной комнате» нет улик, продвиньтесь.',
      requiredValue: 10,
      currentValue: 0,
      startValue: 0,
      type: 'clue',
    },
  ],
};
