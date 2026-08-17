import { type } from 'arktype';

export const vitals = type({
  max: 'number.integer >= 0',
  damaged: 'number.integer >= 0',
});

export type Vitals = typeof vitals.infer;

export const health = vitals;
export const sanity = vitals;
