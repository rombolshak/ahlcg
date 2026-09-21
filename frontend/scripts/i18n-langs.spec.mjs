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
  let i18nDir;
  let languagesFile;
  let outputFile;
  let log;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-langs-'));
    i18nDir = path.join(tmpDir, 'i18n');
    fs.mkdirSync(i18nDir);
    languagesFile = path.join(tmpDir, 'i18n-languages.json');
    outputFile = path.join(tmpDir, 'generated', 'available-langs.ts');
    log = vi.fn();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should write a generated module with every language found', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English', es: 'Español' }));
    fs.writeFileSync(path.join(i18nDir, 'en.json'), JSON.stringify({ a: 'A', b: 'B' }));
    fs.writeFileSync(path.join(i18nDir, 'es.json'), JSON.stringify({ a: 'Á' }));

    const { entries, errors } = main({ i18nDir, languagesFile, outputFile, log });

    expect(errors).toEqual([]);
    expect(entries).toEqual([
      { id: 'en', label: 'English', coverage: 100, missing: 0, untranslated: 0, orphans: 0 },
      { id: 'es', label: 'Español', coverage: 50, missing: 1, untranslated: 0, orphans: 0 },
    ]);
    expect(fs.readFileSync(outputFile, 'utf8')).toContain('{ id: \'es\', label: "Español", coverage: 50 }');
  });

  it('should ignore a .context.json sitting beside the locales', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English' }));
    fs.writeFileSync(path.join(i18nDir, 'en.json'), JSON.stringify({ a: 'A' }));
    fs.writeFileSync(path.join(i18nDir, 'en.context.json'), JSON.stringify({ a: 'A note about where a sits.' }));

    const { entries, errors } = main({ i18nDir, languagesFile, outputFile, log });

    expect(entries.map(entry => entry.id)).toEqual(['en']);
    expect(errors).toEqual([]);
  });

  it('should report a malformed locale file rather than throw', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English', de: 'Deutsch' }));
    fs.writeFileSync(path.join(i18nDir, 'en.json'), JSON.stringify({ a: 'A' }));
    fs.writeFileSync(path.join(i18nDir, 'de.json'), '{ not json');

    const { entries, errors } = main({ i18nDir, languagesFile, outputFile, log });

    expect(entries.map(entry => entry.id)).toEqual(['en']);
    expect(errors.some(error => error.includes('de.json'))).toBe(true);
  });

  it('should report an orphan key that en.json does not have', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English', es: 'Español' }));
    fs.writeFileSync(path.join(i18nDir, 'en.json'), JSON.stringify({ a: 'A' }));
    fs.writeFileSync(path.join(i18nDir, 'es.json'), JSON.stringify({ a: 'A', b: 'B' }));

    const { errors } = main({ i18nDir, languagesFile, outputFile, log });

    expect(errors.some(error => error.includes('orphan keys'))).toBe(true);
  });

  it('should report a locale file with no entry in i18n-languages.json as an orphan file', () => {
    fs.writeFileSync(languagesFile, JSON.stringify({ en: 'English' }));
    fs.writeFileSync(path.join(i18nDir, 'en.json'), JSON.stringify({ a: 'A' }));
    fs.writeFileSync(path.join(i18nDir, 'de.json'), JSON.stringify({}));

    const { entries, errors } = main({ i18nDir, languagesFile, outputFile, log });

    expect(entries.map(entry => entry.id)).toEqual(['en']);
    expect(errors.some(error => error.includes('de.json'))).toBe(true);
  });
});
