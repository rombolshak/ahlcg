import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(scriptsDir, '..', '..', 'crowdin', 'screenshots');
const sourcePath = 'frontend/public/assets/i18n/en.json';
const apiRoot = 'https://api.crowdin.com/api/v2';

/**
 * The Crowdin CLI is used for everything else, but not here: it is a Java program that fails with
 * `self signed certificate in certificate chain` behind a TLS-intercepting proxy, where `fetch`
 * succeeds. The REST calls it would have made are short enough to issue directly.
 */
function readToken() {
  const inline = process.env.CROWDIN_PERSONAL_TOKEN;
  if (inline) return inline.trim();

  const file = process.env.CROWDIN_TOKEN_FILE;
  if (file && fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();

  throw new Error('Set CROWDIN_PERSONAL_TOKEN, or CROWDIN_TOKEN_FILE to a file holding the token. See docs/translating.md.');
}

async function api(token, endpoint, init = {}) {
  const response = await fetch(`${apiRoot}${endpoint}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${endpoint} → ${response.status} ${JSON.stringify(body.error ?? body)}`);
  return body;
}

async function resolveSourceFileId(token, projectId) {
  const { data } = await api(token, `/projects/${projectId}/files?limit=500`);
  const match = data.find(entry => entry.data.path.endsWith(`/${sourcePath}`));

  if (!match) throw new Error(`No file ending in ${sourcePath} in project ${projectId}. Has the source been pushed to Crowdin yet?`);
  return match.data.id;
}

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
  const projectId = process.env.CROWDIN_PROJECT_ID;

  if (!projectId) throw new Error('CROWDIN_PROJECT_ID is not set. It is the numeric project id, not the slug.');
  if (!fs.existsSync(screenshotsDir)) throw new Error(`No screenshots at ${screenshotsDir}. Run \`npm run i18n:screenshots\` first.`);

  const files = fs
    .readdirSync(screenshotsDir)
    .filter(name => name.endsWith('.png'))
    .map(name => path.join(screenshotsDir, name));

  if (files.length === 0) throw new Error(`No .png files in ${screenshotsDir}. Run \`npm run i18n:screenshots\` first.`);

  const fileId = await resolveSourceFileId(token, projectId);
  const { data: existing } = await api(token, `/projects/${projectId}/screenshots?limit=500`);
  const byName = new Map(existing.map(entry => [entry.data.name, entry.data.id]));

  for (const file of files) {
    const name = path.basename(file);
    const storageId = await toStorage(token, file);
    const current = byName.get(name);

    // Delete-then-create rather than PUT: the update endpoint rejects `autoTag` and `fileId`, so a
    // replaced image would keep the tags of the one it replaced. Re-uploading a re-captured screen
    // has to re-match its strings, or moved text silently keeps pointing at the old coordinates.
    if (current) await api(token, `/projects/${projectId}/screenshots/${current}`, { method: 'DELETE' });

    const { data } = await api(token, `/projects/${projectId}/screenshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storageId, name, autoTag: true, fileId }),
    });

    log(`${current ? 'replaced' : 'created'} ${name} — ${data.tagsCount ?? 0} strings tagged`);
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    await uploadAll();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
