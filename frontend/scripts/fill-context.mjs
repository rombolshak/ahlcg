import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptsDir, '..');
const appDir = path.join(frontendRoot, 'src', 'app');

/** Every `en.context.json` under `src/app`, paired with the `en.json` path (relative to the
 * frontend root, `/`-joined) it sits beside — that path is what a downloaded record's `file`
 * field ends with, whatever prefix Crowdin puts in front of it. */
function findNotesFiles(root) {
  const found = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile() && entry.name === 'en.context.json') {
        const enJsonPath = path.relative(frontendRoot, path.join(dir, 'en.json')).split(path.sep).join('/');
        found.push({ enJsonPath, notes: JSON.parse(fs.readFileSync(entryPath, 'utf8')) });
      }
    }
  }

  walk(root);
  return found;
}

function notesFor(recordFile, notesFiles) {
  return notesFiles.find(({ enJsonPath }) => recordFile.endsWith(enJsonPath));
}

/**
 * Fills the `ai_context` of a JSONL produced by `crowdin context download` from the notes authored
 * beside each source file, and touches nothing else on the line. The notes live in the repository
 * rather than being generated from the string alone, because what a translator needs — that a
 * button has three words of room, that `#n#` must survive verbatim, that a line belongs to a
 * randomised pool — is knowledge the source text does not carry.
 */
export function fill(lines, notesFiles) {
  const filled = [];
  const withoutNote = [];
  const usedKeysByFile = new Map();

  const out = lines.map(line => {
    const record = JSON.parse(line);
    const match = notesFor(record.file, notesFiles);
    const note = match?.notes[record.key];

    if (match) {
      const used = usedKeysByFile.get(match.enJsonPath) ?? new Set();
      used.add(record.key);
      usedKeysByFile.set(match.enJsonPath, used);
    }

    if (note === undefined) {
      withoutNote.push(record.key);
      return JSON.stringify(record);
    }

    filled.push(record.key);
    return JSON.stringify({ ...record, ai_context: note });
  });

  const unused = [];
  for (const { enJsonPath, notes } of notesFiles) {
    const used = usedKeysByFile.get(enJsonPath) ?? new Set();
    for (const key of Object.keys(notes)) {
      if (key === '_comment' || used.has(key)) continue;
      unused.push(`${enJsonPath}#${key}`);
    }
  }

  return { out, filled, withoutNote, unused };
}

export function readNotes() {
  return findNotesFiles(appDir);
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const target = process.argv[2] ?? path.resolve(frontendRoot, '..', 'crowdin-context.jsonl');

  if (!fs.existsSync(target)) {
    console.error(`No ${target}. Run \`crowdin context download\` first.`);
    process.exitCode = 1;
  } else {
    const lines = fs.readFileSync(target, 'utf8').split(/\r?\n/).filter(Boolean);
    const { out, filled, withoutNote, unused } = fill(lines, readNotes());

    fs.writeFileSync(target, `${out.join('\n')}\n`);
    console.log(`${filled.length} of ${lines.length} strings given context`);

    if (withoutNote.length > 0) console.log(`\n${withoutNote.length} string(s) have no note in en.context.json:\n  ${withoutNote.join('\n  ')}`);
    if (unused.length > 0) console.log(`\n${unused.length} note(s) describe a string that no longer exists:\n  ${unused.join('\n  ')}`);
  }
}
