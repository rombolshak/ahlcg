import { Agenda } from '../agenda.model';

export const testAgenda: Agenda = {
  id: 2314,
  info: {
    title: 'Прорываясь вперёд',
    setInfo: {
      set: '02',
      index: '314',
    },
    copyright: {
      illustrator: 'Stephen Somers',
      ffg: '2016',
    },
    flavor:
      'Куда бы вы ни направились в этой искажённой реальности, вам видится вдалеке какая-то тень. Сначала она выглядела как чёрная луна со множеством извивающихся рук. Но теперь вы готовы поклясться, что она становится всё больше и больше…',
    abilities: [
      '<b>Обязательно —</b> После того как эффект карты контакта переместил вас в локацию: Получите 1 ужас.',
    ],
    cardType: 'agenda',
  },

  stage: 3,
  requiredDoom: 10,
  doomOnCards: 0,
  currentDoom: 9,
};
