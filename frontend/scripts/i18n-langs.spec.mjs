import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { coverageFor, flattenKeys, main, orphanKeysOf } from './i18n-langs.mjs';

describe('flattenKeys', () => {
  it('should flatten nested keys to dotted paths', () => {
    const keys = flattenKeys({ a: { b: 'x', c: { d: 'y' } }, e: 'z' });

    expect(keys.sort()).toEqual(['a.b', 'a.c.d', 'e']);
  });

  it('should return no keys for an empty object', () => {
    expect(flattenKeys({})).toEqual([]);
  });
});

describe('coverageFor', () => {
  const entries = object => new Map(Object.entries(object));
  const en = entries({ a: 'A', b: 'B' });

  it('should report 0% for an empty locale', () => {
    expect(coverageFor(en, entries({})).percentage).toBe(0);
  });

  it('should report 100% when every key carries its own translation', () => {
    expect(coverageFor(en, entries({ a: 'Ä', b: 'Bö' })).percentage).toBe(100);
  });

  it('should list the keys en.json has that the locale is missing', () => {
    expect(coverageFor(en, entries({ a: 'Ä' })).missing).toEqual(['b']);
  });

  it('should count an empty value as untranslated rather than present', () => {
    const result = coverageFor(en, entries({ a: 'Ä', b: '' }));

    expect(result.untranslated).toEqual(['b']);
    expect(result.missing).toEqual([]);
    expect(result.percentage).toBe(50);
  });

  it('should count a whitespace-only value as untranslated', () => {
    expect(coverageFor(en, entries({ a: 'Ä', b: '   ' })).untranslated).toEqual(['b']);
  });

  it('should count a value identical to English as untranslated', () => {
    expect(coverageFor(en, entries({ a: 'Ä', b: 'B' })).untranslated).toEqual(['b']);
  });

  it('should report 0% for a locale exported wholesale as the English source', () => {
    expect(coverageFor(en, entries({ a: 'A', b: 'B' })).percentage).toBe(0);
  });
});

describe('orphanKeysOf', () => {
  it('should detect a key the locale has that en.json does not', () => {
    expect(orphanKeysOf(['a'], ['a', 'b'])).toEqual(['b']);
  });

  it('should report no orphans when the locale is a subset of en.json', () => {
    expect(orphanKeysOf(['a', 'b'], ['a'])).toEqual([]);
  });
});

describe('main', () => {
  let tmpDir;
  let i18nRoot;
  let languagesFile;
  let outputFile;
  let log;

  const scope = (relativeDir, files) => {
    const dir = path.join(i18nRoot, ...relativeDir.split('/'));
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), typeof content === 'string' ? content : JSON.stringify(content));
    }
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-langs-'));
    i18nRoot = path.join(tmpDir, 'app');
    fs.mkdirSync(i18nRoot);
    languagesFile = path.join(tmpDir, 'i18n-languages.json');
    outputFile = path.join(tmpDir, 'generated', 'available-langs.ts');
    log = vi.fn();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should list a language that has no file in any scope, at 0%', () => {
    // given a language nobody has started translating — no scope carries a file for it
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English', de: 'Deutsch' }));
    scope('pages/one', { 'en.json': { a: 'A', b: 'B' } });

    // when the report is built
    const { entries, errors } = main({ i18nRoot, languagesFile, outputFile, log });

    // then it is still offered to `?lang=`, rather than dropping out of the generated module
    expect(errors).toEqual([]);
    expect(entries).toContainEqual({ id: 'de', label: 'Deutsch', coverage: 0, missing: 2, untranslated: 0, orphans: 0 });
  });

  it('should write a generated module with every language found', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English', es: 'Español' }));
    scope('pages/one', { 'en.json': { a: 'A', b: 'B' }, 'es.json': { a: 'Á' } });

    const { entries, errors } = main({ i18nRoot, languagesFile, outputFile, log });

    expect(errors).toEqual([]);
    expect(entries).toEqual([
      { id: 'en', label: 'English', coverage: 100, missing: 0, untranslated: 0, orphans: 0 },
      { id: 'es', label: 'Español', coverage: 50, missing: 1, untranslated: 0, orphans: 0 },
    ]);
    expect(fs.readFileSync(outputFile, 'utf8')).toContain('{ id: \'es\', label: "Español", coverage: 50 }');
  });

  it('should aggregate coverage across every scope, not just the first', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English', es: 'Español' }));
    scope('pages/one', { 'en.json': { a: 'A' }, 'es.json': { a: 'Á' } });
    scope('pages/two', { 'en.json': { a: 'A' }, 'es.json': { a: 'A' } }); // untranslated: identical to English

    const { entries } = main({ i18nRoot, languagesFile, outputFile, log });

    // One key present, one identical to English — 50% over the union of both scopes' `a` key.
    expect(entries.find(entry => entry.id === 'es')).toEqual({ id: 'es', label: 'Español', coverage: 50, missing: 0, untranslated: 1, orphans: 0 });
  });

  it('should treat a scope with no file at all for a language as entirely missing for that language', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English', es: 'Español' }));
    scope('pages/one', { 'en.json': { a: 'A' }, 'es.json': { a: 'Á' } });
    scope('pages/two', { 'en.json': { a: 'A' } }); // no es.json at all

    const { entries } = main({ i18nRoot, languagesFile, outputFile, log });

    expect(entries.find(entry => entry.id === 'es')).toEqual({ id: 'es', label: 'Español', coverage: 50, missing: 1, untranslated: 0, orphans: 0 });
  });

  it('should ignore a .context.json sitting beside a scope’s en.json', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English' }));
    scope('pages/one', { 'en.json': { a: 'A' }, 'en.context.json': { a: 'A note about where a sits.' } });

    const { entries, errors } = main({ i18nRoot, languagesFile, outputFile, log });

    expect(entries.map(entry => entry.id)).toEqual(['en']);
    expect(errors).toEqual([]);
  });

  it('should report a malformed locale file rather than throw', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English', de: 'Deutsch' }));
    scope('pages/one', { 'en.json': { a: 'A' }, 'de.json': '{ not json' });

    const { entries, errors } = main({ i18nRoot, languagesFile, outputFile, log });

    expect(entries.map(entry => entry.id)).toEqual(['en']);
    expect(errors.some(error => error.includes('de.json'))).toBe(true);
  });

  it('should report an orphan in one scope without failing a healthy scope', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English', es: 'Español' }));
    scope('pages/one', { 'en.json': { a: 'A' }, 'es.json': { a: 'A', b: 'B' } }); // b is an orphan here
    scope('pages/two', { 'en.json': { a: 'A' }, 'es.json': { a: 'Á' } });

    const { entries, errors } = main({ i18nRoot, languagesFile, outputFile, log });

    expect(errors.some(error => error.includes('pages/one/es.json') && error.includes('orphan keys'))).toBe(true);
    expect(errors.some(error => error.includes('pages/two'))).toBe(false);
    expect(entries.find(entry => entry.id === 'es').orphans).toBe(1);
  });

  it('should report a locale file with no entry in i18n-languages.json as an orphan file', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English' }));
    scope('pages/one', { 'en.json': { a: 'A' }, 'de.json': {} });

    const { entries, errors } = main({ i18nRoot, languagesFile, outputFile, log });

    expect(entries.map(entry => entry.id)).toEqual(['en']);
    expect(errors.some(error => error.includes('de.json'))).toBe(true);
  });

  it('should treat a nested scope as its own scope, distinct from its parent', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English', es: 'Español' }));
    scope('features/settings', { 'en.json': { title: 'Settings' }, 'es.json': { title: 'Ajustes' } });
    scope('features/settings/account', { 'en.json': { title: 'Your account' }, 'es.json': { title: 'Your account' } });

    const { entries } = main({ i18nRoot, languagesFile, outputFile, log });

    // Both scopes share the leaf key `title`; the parent's is translated and the child's is not.
    expect(entries.find(entry => entry.id === 'es')).toEqual({ id: 'es', label: 'Español', coverage: 50, missing: 0, untranslated: 1, orphans: 0 });
  });
});
