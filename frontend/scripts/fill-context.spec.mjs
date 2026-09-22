import { describe, expect, it } from 'vitest';
import { fill } from './fill-context.mjs';

const line = (key, file, extra = {}) => JSON.stringify({ id: 1, key, text: 'Text', file, context: 'existing', ai_context: '', ...extra });

const notesFile = (enJsonPath, notes) => ({ enJsonPath, notes });

describe('fill', () => {
  it('should write the note into ai_context', () => {
    const { out } = fill([line('a.title', '/frontend/src/app/pages/main-menu/en.json')], [notesFile('src/app/pages/main-menu/en.json', { 'a.title': 'A heading.' })]);

    expect(JSON.parse(out[0]).ai_context).toBe('A heading.');
  });

  it('should leave every other field untouched', () => {
    const { out } = fill([line('a.title', '/frontend/src/app/pages/main-menu/en.json')], [notesFile('src/app/pages/main-menu/en.json', { 'a.title': 'A heading.' })]);
    const { ai_context, ...rest } = JSON.parse(out[0]);

    expect(rest).toEqual({ id: 1, key: 'a.title', text: 'Text', file: '/frontend/src/app/pages/main-menu/en.json', context: 'existing' });
    expect(ai_context).toBe('A heading.');
  });

  it('should report a string with no note and leave its ai_context alone', () => {
    const { out, withoutNote } = fill([line('a.title', '/frontend/src/app/pages/main-menu/en.json')], [notesFile('src/app/pages/main-menu/en.json', {})]);

    expect(withoutNote).toEqual(['a.title']);
    expect(JSON.parse(out[0]).ai_context).toBe('');
  });

  it('should report a string whose file matches no notes file, without throwing', () => {
    const { withoutNote } = fill([line('a.title', '/frontend/src/app/pages/unknown/en.json')], [notesFile('src/app/pages/main-menu/en.json', { 'a.title': 'A heading.' })]);

    expect(withoutNote).toEqual(['a.title']);
  });

  it('should report a note whose string is gone', () => {
    const { unused } = fill([line('a.title', '/frontend/src/app/pages/main-menu/en.json')], [
      notesFile('src/app/pages/main-menu/en.json', { 'a.title': 'A heading.', 'b.gone': 'Orphan.' }),
    ]);

    expect(unused).toEqual(['src/app/pages/main-menu/en.json#b.gone']);
  });

  it('should ignore the comment key', () => {
    const { unused } = fill([line('a.title', '/frontend/src/app/pages/main-menu/en.json')], [
      notesFile('src/app/pages/main-menu/en.json', { _comment: 'not a string', 'a.title': 'A heading.' }),
    ]);

    expect(unused).toEqual([]);
  });

  it('should match each record to the right notes file when two scopes share a key name', () => {
    const lines = [line('title', '/frontend/src/app/features/settings/en.json'), line('title', '/frontend/src/app/features/settings/account/en.json')];
    const notes = [
      notesFile('src/app/features/settings/en.json', { title: 'Title of the settings dialog.' }),
      notesFile('src/app/features/settings/account/en.json', { title: 'Title of the account view.' }),
    ];

    const { out } = fill(lines, notes);

    expect(JSON.parse(out[0]).ai_context).toBe('Title of the settings dialog.');
    expect(JSON.parse(out[1]).ai_context).toBe('Title of the account view.');
  });

  it('should keep each line a single valid JSON object', () => {
    const lines = [line('a.title', '/frontend/src/app/pages/main-menu/en.json'), line('b.message', '/frontend/src/app/pages/main-menu/en.json')];
    const notes = [notesFile('src/app/pages/main-menu/en.json', { 'a.title': 'Quote " and \\ backslash.', 'b.message': 'Body.' })];

    const { out } = fill(lines, notes);

    expect(out.every(entry => !entry.includes('\n'))).toBe(true);
    expect(JSON.parse(out[0]).ai_context).toBe('Quote " and \\ backslash.');
  });
});
