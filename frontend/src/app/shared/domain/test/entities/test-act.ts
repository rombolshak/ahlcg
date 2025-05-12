import { Act } from '../../entities/act.model';
import { actId } from '../../entities/id.model';

export const testAct: Act = {
  id: actId.assert('2200'),
  type: 'act',
  info: {
    title: 'Обиталище Зверя',
    flavor:
      'Жалкая тварь пытается схватить вас скользкими руками, её челюсти клацают от голода. Убить существо было бы милосердием. Но возможно, вам стоит побольше узнать об этом чудовище…',
    abilities: [],
    setInfo: {
      set: '02',
      index: '200',
    },
    copyright: {
      illustrator: 'Jeff Lee Johnson',
      ffg: '2016',
    },
  },

  stage: 2,
  objectives: [
    {
      description: '<b>Цель —</b> Если «Сайлас Бишоп» побеждён, (→<b>И1</b>).',
      requiredValue: 0,
      currentValue: 12,
      startValue: 18,
      type: 'health',
    },
    {
      description:
        '<b>Цель —</b> Если в «Тайной комнате» нет улик, продвиньтесь.',
      requiredValue: 0,
      currentValue: 4,
      startValue: 6,
      type: 'clue',
    },
  ],
};
