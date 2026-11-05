import { type } from 'arktype';

const revision = type('number.integer >= 0');
const syncId = type('string.uuid');
export const operation = type({ op: "'add' | 'replace' | 'test'", path: 'string', value: 'unknown' })
  .or({ op: "'remove'", path: 'string' })
  .or({ op: "'move' | 'copy'", from: 'string', path: 'string' });
const gamePath = (path: string): boolean => path === '/game' || path.startsWith('/game/');
const prediction = operation.array().narrow(patch => patch.every(op => gamePath(op.path) && (!('from' in op) || gamePath(op.from))));
export const actions = type({ '[string]': prediction });
const destination = type({ kind: "'checkpoint' | 'undo'", version: revision, checkpointId: 'string | null' });
const proposal = type({
  id: syncId,
  sourceGameVersion: revision,
  requesterId: 'string',
  destination,
  requiredVoterIds: 'string[]',
  approvedVoterIds: 'string[]',
}).or('null');
const outcome = type({ id: syncId, destination, requesterId: 'string', status: 'string', rejectingMemberId: 'string | null' }).or('null');
export const engineState = type({
  gameVersion: revision,
  members: { '[string]': 'boolean' },
  memberId: 'string | null',
  inviteCode: 'string | null',
  rewind: { checkpoints: { '[string]': revision }, undo: type({ version: revision, actor: 'string' }).or('null') },
  proposal,
  outcome,
});
export const gameState = type({ syncId, version: revision, engine: engineState, game: 'unknown' });
export const memberState = type({ state: gameState, actions }).or('null');
export const stateChange = type({
  kind: "'Delta'",
  syncId,
  version: revision,
  sourceGameVersion: revision,
  gameVersion: revision,
  patch: operation.array(),
  actions: actions.or('null'),
  isRestore: 'boolean',
}).or({ kind: "'ResetRequired'", syncId });

export type EngineState = typeof engineState.infer;
export type GameState = typeof gameState.infer;
export type MemberState = NonNullable<typeof memberState.infer>;
export type StateChange = typeof stateChange.infer;
export type StateDelta = Extract<StateChange, { kind: 'Delta' }>;
export type MemberStateEvent = { kind: 'reset'; state: MemberState | null } | { kind: 'change'; change: StateDelta };

export const touchesGame = (patch: StateDelta['patch']): boolean =>
  patch.some(operation => gamePath(operation.path) || ('from' in operation && gamePath(operation.from)));
