import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, json, projectId, readToken, resolveSourceFileId } from './crowdin-api.mjs';
import { flattenKeys } from './i18n-langs.mjs';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptsDir, '..');
const contextFile = path.join(frontendRoot, 'i18n-context.json');
const sourceFile = path.join(frontendRoot, 'public', 'assets', 'i18n', 'en.json');

export function readContext() {
  const entries = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
  return new Map(Object.entries(entries).filter(([key]) => !key.startsWith('_')));
}

/** Keys that have a string but no note, and notes whose string is gone. Reported, never fatal. */
export function reconcile(contextKeys, sourceKeys) {
  return {
    missing: sourceKeys.filter(key => !contextKeys.includes(key)),
    stale: contextKeys.filter(key => !sourceKeys.includes(key)),
  };
}

export async function uploadContext({ log = console.log } = {}) {
  const token = readToken();
  const project = projectId();

  const context = readContext();
  const { missing, stale } = reconcile([...context.keys()], flattenKeys(JSON.parse(fs.readFileSync(sourceFile, 'utf8'))));

  const fileId = await resolveSourceFileId(token, project);
  const { data: strings } = await api(token, `/projects/${project}/strings?fileId=${fileId}&limit=500`);

  let updated = 0;
  let unchanged = 0;

  for (const entry of strings) {
    const wanted = context.get(entry.data.identifier);
    if (wanted === undefined) continue;

    // Only write what changed: Crowdin records an edit per PATCH, and a no-op still shows up in
    // the project's activity feed as if someone had revised the string.
    if (wanted === entry.data.context) {
      unchanged += 1;
      continue;
    }

    await api(token, `/projects/${project}/strings/${entry.data.id}`, { method: 'PATCH', ...json([{ op: 'replace', path: '/context', value: wanted }]) });
    updated += 1;
  }

  log(`context: ${updated} updated, ${unchanged} already current, ${missing.length} without a note`);

  if (missing.length > 0) log(`\n${missing.length} string(s) have no note in i18n-context.json:\n  ${missing.join('\n  ')}`);
  if (stale.length > 0) log(`\n${stale.length} note(s) describe a string that no longer exists:\n  ${stale.join('\n  ')}`);

  return { updated, missing, stale };
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    await uploadContext();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
