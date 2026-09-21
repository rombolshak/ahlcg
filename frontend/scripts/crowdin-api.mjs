import fs from 'node:fs';

const apiRoot = 'https://api.crowdin.com/api/v2';
export const sourcePath = 'frontend/public/assets/i18n/en.json';

export function readToken() {
  const inline = process.env.CROWDIN_PERSONAL_TOKEN;
  if (inline) return inline.trim();

  const file = process.env.CROWDIN_TOKEN_FILE;
  if (file && fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();

  throw new Error('Set CROWDIN_PERSONAL_TOKEN, or CROWDIN_TOKEN_FILE to a file holding the token. See docs/translating.md.');
}

export function projectId() {
  const id = process.env.CROWDIN_PROJECT_ID;
  if (!id) throw new Error('CROWDIN_PROJECT_ID is not set. It is the numeric project id, not the slug.');
  return id;
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retries the connection itself, not the request's verdict: a 4xx is an answer and repeating it
 * would only repeat the mistake. Dropped sockets are common enough through a proxy that an
 * unattended run would otherwise fail on one.
 */
export async function api(token, endpoint, init = {}, attempt = 1) {
  let response;

  try {
    response = await fetch(`${apiRoot}${endpoint}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
  } catch (error) {
    if (attempt >= 3) throw new Error(`${init.method ?? 'GET'} ${endpoint} → ${error.cause?.code ?? error.message} after ${attempt} attempts`);
    await wait(attempt * 1000);
    return api(token, endpoint, init, attempt + 1);
  }

  const body = await response.text();
  const parsed = body ? JSON.parse(body) : {};

  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${endpoint} → ${response.status} ${JSON.stringify(parsed.error ?? parsed)}`);
  return parsed;
}

export const json = payload => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

export async function resolveSourceFileId(token, project) {
  const { data } = await api(token, `/projects/${project}/files?limit=500`);
  const match = data.find(entry => entry.data.path.endsWith(`/${sourcePath}`));

  if (!match) throw new Error(`No file ending in ${sourcePath} in project ${project}. Has the source reached Crowdin yet?`);
  return match.data.id;
}
