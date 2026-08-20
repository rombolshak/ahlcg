import { Agenda } from '@domain/entities/agenda.model';
import { agendaId } from '@domain/entities/id.model';

export const testAgenda: Agenda = {
  id: agendaId.assert('2314'),
  cardType: 'agenda',
  setInfo: {
    set: '02',
    index: '314',
  },
  stage: 3,
  requiredDoom: 10,
  doomOnCards: 0,
  currentDoom: 9,
};
