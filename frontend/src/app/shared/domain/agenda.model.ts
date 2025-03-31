import { type } from 'arktype';
import { gameCardWithoutTraits } from './card.model';

const _agenda = gameCardWithoutTraits.and({
  stage: 'number.integer',
  requiredDoom: 'number.integer',
  currentDoom: 'number.integer',
  doomOnCards: 'number.integer',
});

type _Agenda = typeof _agenda.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface Agenda extends _Agenda {}

export const agenda: type<Agenda> = _agenda;
