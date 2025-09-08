import { type } from 'arktype';

const gamePhase = type("'mythos' | 'investigators' | 'enemy' | 'upkeep'");
export type GamePhase = typeof gamePhase.infer;

export const metaInfo = type({
  campaignId: 'string > 0',
  scenarioId: 'string > 0',
  roundNumber: 'number >= 0',
  gamePhase,
});

export type MetaInfo = typeof metaInfo.infer;
