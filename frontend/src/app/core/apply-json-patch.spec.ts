import { applyJsonPatch } from './apply-json-patch';

describe('applyJsonPatch', () => {
  it('should apply the operations to a copy of the state', () => {
    // given
    const state = { shared: 1, other: { value: 2 } };

    // when
    const result = applyJsonPatch(state, [{ op: 'replace', path: '/shared', value: 5 }]);

    // then
    expect(result.shared).toBe(5);
    expect(state.shared).toBe(1);
  });

  it('should throw when an operation fails', () => {
    // given
    const state = { shared: 1 };

    // when
    const apply = () => applyJsonPatch(state, [{ op: 'remove', path: '/missing' }]);

    // then
    expect(apply).toThrow('Error applying changes');
  });

  it('should keep the reference of untouched subtrees', () => {
    // given
    const state = { shared: 1, other: { value: 2 } };

    // when
    const result = applyJsonPatch(state, [{ op: 'replace', path: '/shared', value: 5 }]);

    // then
    expect(result.other).toBe(state.other);
  });
});
