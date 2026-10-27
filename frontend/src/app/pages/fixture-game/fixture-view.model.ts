import { type } from 'arktype';

export const fixtureView = type({
  shared: 'number.integer',
  revealed: 'number.integer | null',
  ownSecret: 'number.integer',
  actingPlayers: 'string[]',
  others: { '[string]': "'Negative' | 'Zero' | 'Positive'" },
  journal: type({ key: 'string', parameters: { '[string]': 'unknown' } }).array(),
});
export type FixtureView = typeof fixtureView.infer;
