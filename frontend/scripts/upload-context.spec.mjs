import { describe, expect, it } from 'vitest';
import { reconcile } from './upload-context.mjs';

describe('reconcile', () => {
  it('should report a source string that has no note', () => {
    expect(reconcile(['a'], ['a', 'b']).missing).toEqual(['b']);
  });

  it('should report a note whose string no longer exists', () => {
    expect(reconcile(['a', 'gone'], ['a']).stale).toEqual(['gone']);
  });

  it('should report nothing when the two agree', () => {
    expect(reconcile(['a', 'b'], ['b', 'a'])).toEqual({ missing: [], stale: [] });
  });

  it('should treat an empty context file as everything missing', () => {
    expect(reconcile([], ['a', 'b']).missing).toEqual(['a', 'b']);
  });
});
