import { produce } from 'immer';
import { applyPatch, Operation } from 'rfc6902';

export function applyJsonPatch<T>(state: T, operations: Operation[]): T {
  return produce(state, draft => {
    const results = applyPatch(draft, operations);
    const errors = results.filter(r => r !== null);
    if (errors.length > 0) {
      throw new Error('Error applying changes: ' + errors.map(e => e.message).join('; '));
    }
  });
}
