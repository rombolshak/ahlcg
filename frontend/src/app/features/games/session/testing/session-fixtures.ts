import { Operation } from 'rfc6902';
import { MemberState, StateDelta } from '../game-state.model';

export const SYNC_ID = '019a5100-0000-7000-8000-000000000001';
const inGame = (patch: Operation[]): Operation[] =>
  patch.map(operation => ({
    ...operation,
    path: `/game${operation.path}`,
    ...('from' in operation ? { from: `/game${operation.from}` } : {}),
  }));
export const snapshot = (game: unknown, version = 0, actions: MemberState['actions'] = {}, inviteCode: string | null = null): MemberState => ({
  state: {
    syncId: SYNC_ID,
    version,
    engine: {
      gameVersion: version,
      memberId: 'alice',
      members: { alice: true },
      inviteCode,
      rewind: { checkpoints: {}, undo: null },
      proposal: null,
      outcome: null,
    },
    game,
  },
  actions: Object.fromEntries(Object.entries(actions).map(([id, patch]) => [id, inGame(patch)])),
});
export const delta = (version: number, patch: Operation[], actions: MemberState['actions'] = {}): StateDelta => ({
  kind: 'Delta',
  syncId: SYNC_ID,
  version,
  sourceGameVersion: version - 1,
  gameVersion: version,
  isRestore: false,
  patch: [{ op: 'replace', path: '/version', value: version }, { op: 'replace', path: '/engine/gameVersion', value: version }, ...inGame(patch)],
  actions: Object.fromEntries(Object.entries(actions).map(([id, prediction]) => [id, inGame(prediction)])),
});
