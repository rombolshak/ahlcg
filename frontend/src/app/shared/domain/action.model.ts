/* eslint-disable @typescript-eslint/no-empty-object-type */
import { type } from 'arktype';

const _action = type({
  id: 'number.integer >= 0',
  title: 'string',
  cost: 'string',
});

type _Action = typeof _action.infer;

export interface Action extends _Action {}

export type Actions = Action[];

export const action: type<Action> = _action;
export const actions: type<Actions> = _action.array();
