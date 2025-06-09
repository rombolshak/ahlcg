import { type } from 'arktype';
import { gameCard } from './card.model';
import { agendaId } from './id.model';

const _agenda = gameCard.and({
  id: agendaId,
  cardType: "'agenda'",
  stage: 'number.integer > 0',
  requiredDoom: 'number.integer >= 0',
  currentDoom: 'number.integer >= 0',
  doomOnCards: 'number.integer >= 0',
});

type _Agenda = typeof _agenda.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface Agenda extends _Agenda {}

export const agenda: type<Agenda> = _agenda;
