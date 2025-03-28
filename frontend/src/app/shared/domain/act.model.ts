import { type } from 'arktype';
import { gameCardWithoutTraits } from './card.model';

const _objective = type({
  type: "'clue' | 'health' | 'resource'",
  description: 'string',
  requiredValue: 'number.integer >= 0',
  currentValue: 'number >= 0',
  startValue: 'number >= 0',
});

type _Objective = typeof _objective.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
interface Objective extends _Objective {}

const objective: type<Objective> = _objective;

const _act = gameCardWithoutTraits.and({
  stage: 'number.integer > 0',
  objectives: objective.array(),
});

type _Act = typeof _act.infer;

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface Act extends _Act {}

export const act: type<Act> = _act;
