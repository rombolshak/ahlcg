import { startAppHost } from './apphost';

const BOOT_TIMEOUT_MS = 5 * 60_000;
const ATTACH_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 2_000;

export default async function globalSetup(): Promise<void> {
  const attachUrl = process.env['E2E_BASE_URL']?.trim() || undefined;
  const url = attachUrl ?? (await startAppHost());

  await waitForServer(url, attachUrl === undefined ? BOOT_TIMEOUT_MS : ATTACH_TIMEOUT_MS);
  process.env['E2E_BASE_URL'] = url;
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // ng serve is still compiling, or the dev server has not bound its port yet - keep polling.
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`webfrontend at ${url} did not answer within ${timeoutMs}ms.`);
}
