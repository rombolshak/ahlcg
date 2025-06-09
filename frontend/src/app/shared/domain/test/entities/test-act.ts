import { Act } from '../../entities/act.model';
import { actId } from '../../entities/id.model';

export const testAct: Act = {
  id: actId.assert('2200'),
  cardType: 'act',
  setInfo: {
    set: '02',
    index: '200',
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
