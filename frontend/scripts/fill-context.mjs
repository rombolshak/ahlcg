import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptsDir, '..');
const notesFile = path.join(frontendRoot, 'public', 'assets', 'i18n', 'en.context.json');

/**
 * Fills the `ai_context` of a JSONL produced by `crowdin context download` from the notes authored
 * in `en.context.json`, and touches nothing else on the line. The notes live in the repository
 * rather than being generated from the string alone, because what a translator needs — that a
 * button has three words of room, that `#n#` must survive verbatim, that a line belongs to a
 * randomised pool — is knowledge the source text does not carry.
 */
export function fill(lines, notes) {
  const filled = [];
  const withoutNote = [];

  const out = lines.map(line => {
    const record = JSON.parse(line);
    const note = notes[record.key];

    if (note === undefined) {
      withoutNote.push(record.key);
      return JSON.stringify(record);
    }

    filled.push(record.key);
    return JSON.stringify({ ...record, ai_context: note });
  });

  const keys = new Set(lines.map(line => JSON.parse(line).key));
  const unused = Object.keys(notes).filter(key => !key.startsWith('_') && !keys.has(key));

  return { out, filled, withoutNote, unused };
}

export function readNotes() {
  return JSON.parse(fs.readFileSync(notesFile, 'utf8'));
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
