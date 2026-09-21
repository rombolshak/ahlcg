import { describe, expect, it } from 'vitest';
import { fill } from './fill-context.mjs';

const line = (key, extra = {}) => JSON.stringify({ id: 1, key, text: 'Text', file: '/main/en.json', context: 'existing', ai_context: '', ...extra });

describe('fill', () => {
  it('should write the note into ai_context', () => {
    const { out } = fill([line('a.title')], { 'a.title': 'A heading.' });

    expect(JSON.parse(out[0]).ai_context).toBe('A heading.');
  });

  it('should leave every other field untouched', () => {
    const { out } = fill([line('a.title')], { 'a.title': 'A heading.' });
    const { ai_context, ...rest } = JSON.parse(out[0]);

    expect(rest).toEqual({ id: 1, key: 'a.title', text: 'Text', file: '/main/en.json', context: 'existing' });
    expect(ai_context).toBe('A heading.');
  });

  it('should report a string with no note and leave its ai_context alone', () => {
    const { out, withoutNote } = fill([line('a.title')], {});

    expect(withoutNote).toEqual(['a.title']);
    expect(JSON.parse(out[0]).ai_context).toBe('');
  });

  it('should report a note whose string is gone', () => {
    const { unused } = fill([line('a.title')], { 'a.title': 'A heading.', 'b.gone': 'Orphan.' });

    expect(unused).toEqual(['b.gone']);
  });

  it('should ignore the comment key', () => {
    const { unused } = fill([line('a.title')], { _comment: 'not a string', 'a.title': 'A heading.' });

    expect(unused).toEqual([]);
  });

  it('should keep each line a single valid JSON object', () => {
    const { out } = fill([line('a.title'), line('b.message')], { 'a.title': 'Quote " and \\ backslash.', 'b.message': 'Body.' });

    expect(out.every(entry => !entry.includes('\n'))).toBe(true);
    expect(JSON.parse(out[0]).ai_context).toBe('Quote " and \\ backslash.');
  });
});
