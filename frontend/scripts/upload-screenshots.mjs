import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, json, projectId, readToken, resolveSourceFileId, sourcePath } from './crowdin-api.mjs';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(scriptsDir, '..', '..', 'crowdin', 'screenshots');

async function toStorage(token, file) {
  const { data } = await api(token, '/storages', {
    method: 'POST',
    headers: { 'Crowdin-API-FileName': path.basename(file), 'Content-Type': 'application/octet-stream' },
    body: fs.readFileSync(file),
  });

  return data.id;
}

export async function uploadAll({ log = console.log } = {}) {
  const token = readToken();
  const project = projectId();

  if (!fs.existsSync(screenshotsDir)) throw new Error(`No screenshots at ${screenshotsDir}. Run \`npm run i18n:screenshots\` first.`);

  const files = fs
    .readdirSync(screenshotsDir)
    .filter(name => name.endsWith('.png'))
    .map(name => path.join(screenshotsDir, name));

  if (files.length === 0) throw new Error(`No .png files in ${screenshotsDir}. Run \`npm run i18n:screenshots\` first.`);

  // `--auto-tag` matches the text Crowdin reads off the image against the source strings, so the
  // screenshots have to be of the English UI. Scoping to our one file keeps it from tagging card
  // and trait text, which is not ours to translate.
  const fileId = await resolveSourceFileId(token, project);
  const { data: existing } = await api(token, `/projects/${project}/screenshots?limit=500`);
  const byName = new Map(existing.map(entry => [entry.data.name, entry.data.id]));

  let tagged = 0;

  for (const file of files) {
    const name = path.basename(file);
    const storageId = await toStorage(token, file);
    const current = byName.get(name);

    // Delete-then-create rather than PUT: the update endpoint rejects `autoTag` and `fileId`, so a
    // replaced image would keep the tags of the one it replaced. Re-uploading a re-captured screen
    // has to re-match its strings, or moved text silently keeps pointing at the old coordinates.
    if (current) await api(token, `/projects/${project}/screenshots/${current}`, { method: 'DELETE' });

    const { data } = await api(token, `/projects/${project}/screenshots`, { method: 'POST', ...json({ storageId, name, autoTag: true, fileId }) });

    tagged += data.tagsCount ?? 0;
    log(`${current ? 'replaced' : 'created'} ${name} — ${data.tagsCount ?? 0} strings tagged`);
  }

  // The local set is the whole truth: a story that stopped showing translatable text, or was
  // renamed, leaves a screenshot in Crowdin that nothing will ever update again.
  const wanted = new Set(files.map(file => path.basename(file)));
  const orphans = existing.filter(entry => !wanted.has(entry.data.name));

  for (const orphan of orphans) {
    await api(token, `/projects/${project}/screenshots/${orphan.data.id}`, { method: 'DELETE' });
    log(`removed ${orphan.data.name} — no story produces it any more`);
  }

  // A screenshot that survived capture showed a source string, so nothing tagged means auto-tag
  // failed wholesale — usually the source file not being in Crowdin yet, from `${sourcePath}`.
  if (tagged === 0) throw new Error(`Uploaded ${files.length} screenshots and tagged nothing. Is ${sourcePath} in Crowdin and current?`);

  log(`\n${files.length} screenshots, ${tagged} string tags, ${orphans.length} removed`);
  return { files: files.length, tagged, removed: orphans.length };
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    await uploadAll();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
