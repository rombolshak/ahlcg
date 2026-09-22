import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptsDir, '..');

/** The source language is translated by definition — comparing it against itself would report 0%. */
const SOURCE_LANG = 'en';

const defaultPaths = {
  i18nRoot: path.join(frontendRoot, 'src', 'app'),
  languagesFile: path.join(frontendRoot, 'i18n-languages.json'),
  outputFile: path.join(frontendRoot, 'src', 'app', 'generated', 'available-langs.ts'),
};

/** Flattens a nested translation object into a `dotted.path` → leaf value map. */
export function flattenEntries(value, prefix = '', into = new Map()) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) into.set(prefix, value);
    return into;
  }

  for (const [key, child] of Object.entries(value)) {
    flattenEntries(child, prefix ? `${prefix}.${key}` : key, into);
  }
  return into;
}

/** Flattens a nested translation object into its leaf keys, joined by `.`. */
export function flattenKeys(value) {
  return [...flattenEntries(value).keys()];
}

/**
 * Coverage of a locale against English. A key counts as translated only when it is present, carries
 * a non-blank value, and that value differs from the English one — Crowdin exports untranslated
 * strings either as `""` or as the source text, and counting mere key presence would report a
 * wholly English locale as complete.
 */
export function coverageFor(enEntries, localeEntries) {
  const missing = [];
  const untranslated = [];

  for (const [key, enValue] of enEntries) {
    if (!localeEntries.has(key)) {
      missing.push(key);
      continue;
    }

    const value = localeEntries.get(key);
    const blank = typeof value !== 'string' ? value === null || value === undefined : value.trim() === '';
    if (blank || String(value) === String(enValue)) untranslated.push(key);
  }

  const total = enEntries.size;
  const present = total - missing.length - untranslated.length;

  return { present, missing, untranslated, total, percentage: total === 0 ? 100 : Math.round((present / total) * 100) };
}

/** The source file is its own reference, so it is complete by definition. */
function sourceCoverage(total) {
  return { present: total, missing: [], untranslated: [], total, percentage: 100 };
}

/** Keys that `localeKeys` has and `enKeys` does not — a rename left the locale file behind. */
export function orphanKeysOf(enKeys, localeKeys) {
  const enSet = new Set(enKeys);
  return localeKeys.filter(key => !enSet.has(key));
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Every directory under `root` that holds its own `en.json` is a scope — nested scopes are real
 * (`features/settings` and `features/settings/account` both own one), so a match does not stop the
 * walk into that directory's children.
 */
function findScopeDirs(root) {
  const scopeDirs = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    if (entries.some(entry => entry.isFile() && entry.name === `${SOURCE_LANG}.json`)) {
      scopeDirs.push(dir);
    }
    for (const entry of entries) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name));
    }
  }

  walk(root);
  return scopeDirs;
}

/**
 * Keys are namespaced by scope so two scopes sharing a leaf key name (`title`, `back`, …) never
 * collide in the aggregate coverage map — the scope path can't contain `#`, so it is a safe
 * separator against a key made only of `.`-joined identifiers.
 */
function namespaced(scopePath, key) {
  return `${scopePath}#${key}`;
}

function buildReport({ i18nRoot, languagesFile }) {
  const languageLabels = loadJson(languagesFile);
  const scopeDirs = findScopeDirs(i18nRoot);

  const enEntries = new Map();
  const scopes = [];
  const errors = [];

  for (const scopeDir of scopeDirs) {
    const scopePath = path.relative(i18nRoot, scopeDir).split(path.sep).join('/');
    const scopeEnEntries = flattenEntries(loadJson(path.join(scopeDir, `${SOURCE_LANG}.json`)));
    for (const [key, value] of scopeEnEntries) enEntries.set(namespaced(scopePath, key), value);

    // `*.context.json` sits beside the scope's `en.json` and is translator notes, not translations.
    // Everything else ending in `.json` is treated as a locale, so an unknown one is still reported
    // rather than silently ignored.
    const localeFiles = fs
      .readdirSync(scopeDir, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.json') && !entry.name.endsWith('.context.json') && entry.name !== `${SOURCE_LANG}.json`)
      .map(entry => entry.name);

    scopes.push({ scopeDir, scopePath, enKeys: [...scopeEnEntries.keys()], localeFiles });
  }

  // Seeded from `i18n-languages.json`, not from the files on disk. A language nobody has started
  // has no file in any scope, and deriving the list from files would drop it from the generated
  // module entirely — which is what `?lang=xx` checks against, so a translator could no longer
  // preview the language they are about to begin. It is reported at 0% instead.
  const languageIds = new Set([SOURCE_LANG, ...Object.keys(languageLabels)]);
  for (const scope of scopes) {
    for (const fileName of scope.localeFiles) languageIds.add(fileName.replace(/\.json$/, ''));
  }

  const entries = [];

  for (const id of languageIds) {
    if (!Object.hasOwn(languageLabels, id)) {
      errors.push(`${id}.json: no entry in i18n-languages.json`);
      continue;
    }

    if (id === SOURCE_LANG) {
      entries.push({ id, label: languageLabels[id], coverage: 100, missing: 0, untranslated: 0, orphans: 0 });
      continue;
    }

    const localeEntries = new Map();
    let orphanCount = 0;
    let malformed = false;

    for (const scope of scopes) {
      const fileName = `${id}.json`;
      if (!scope.localeFiles.includes(fileName)) continue;

      let content;
      try {
        content = loadJson(path.join(scope.scopeDir, fileName));
      } catch (error) {
        errors.push(`${scope.scopePath}/${fileName}: malformed JSON (${error.message})`);
        malformed = true;
        continue;
      }

      const scopeLocaleEntries = flattenEntries(content);
      const orphans = orphanKeysOf(scope.enKeys, [...scopeLocaleEntries.keys()]);
      if (orphans.length > 0) {
        errors.push(`${scope.scopePath}/${fileName}: orphan keys not present in en.json: ${orphans.join(', ')}`);
        orphanCount += orphans.length;
      }

      for (const [key, value] of scopeLocaleEntries) localeEntries.set(namespaced(scope.scopePath, key), value);
    }

    if (malformed) continue;

    const coverage = coverageFor(enEntries, localeEntries);
    entries.push({
      id,
      label: languageLabels[id],
      coverage: coverage.percentage,
      missing: coverage.missing.length,
      untranslated: coverage.untranslated.length,
      orphans: orphanCount,
    });
  }

  entries.sort((a, b) => a.id.localeCompare(b.id));

  return { entries, errors };
}

function writeGeneratedModule(entries, outputFile) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  const body = entries.map(entry => `  { id: '${entry.id}', label: ${JSON.stringify(entry.label)}, coverage: ${entry.coverage} },`).join('\n');

  const contents = `// Generated by \`npm run i18n:langs\`. Do not edit by hand.

export interface GeneratedLangEntry {
  id: string;
  label: string;
  coverage: number;
}

export const availableLangs: GeneratedLangEntry[] = [
${body}
];
`;

  fs.writeFileSync(outputFile, contents);
}

function printTable(entries, log) {
  log(entries.map(({ id, label, coverage, missing, untranslated, orphans }) => ({ id, label, coverage: `${coverage}%`, missing, untranslated, orphans })));
}

export function main(options = {}) {
  const { i18nRoot = defaultPaths.i18nRoot, languagesFile = defaultPaths.languagesFile, outputFile = defaultPaths.outputFile, log = console.table } = options;

  const { entries, errors } = buildReport({ i18nRoot, languagesFile });

  writeGeneratedModule(entries, outputFile);
  printTable(entries, log);

  for (const error of errors) {
    console.error(error);
  }

  return { entries, errors };
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes('--check');
  const { errors } = main();

  if (check && errors.length > 0) {
    process.exitCode = 1;
  }
}
