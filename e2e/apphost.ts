import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';

const APPHOST_PROJECT = path.join(__dirname, 'apphost', 'Ahlcg.E2E.AppHost.csproj');
const URL_MARKER = /^E2E_WEBFRONTEND_URL=(.+)$/m;

let child: ChildProcessWithoutNullStreams | undefined;

export async function startAppHost(): Promise<string> {
  const proc = spawn('dotnet', ['run', '--project', APPHOST_PROJECT], { stdio: ['pipe', 'pipe', 'pipe'] });
  child = proc;

  return new Promise<string>((resolve, reject) => {
    let stdout = '';
    let settled = false;

    const onExit = (code: number | null) => {
      if (settled) return;
      settled = true;
      reject(new Error(`AppHost runner exited with code ${code} before reporting its URL.`));
    };

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString();
      process.stdout.write(`[apphost] ${text}`);
      if (settled) return;
      stdout += text;
      const match = URL_MARKER.exec(stdout);
      if (match) {
        settled = true;
        proc.off('exit', onExit);
        resolve(match[1].trim());
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      process.stderr.write(`[apphost] ${chunk.toString()}`);
    });

    proc.on('exit', onExit);
    proc.on('error', reject);
  });
}

const GRACEFUL_SHUTDOWN_MS = 30_000;
const FORCE_KILL_GRACE_MS = 10_000;

/** Closes the runner's stdin (its shutdown signal); escalates to SIGTERM then SIGKILL if it does not exit in time. */
export async function stopAppHost(): Promise<void> {
  if (!child) return;
  const proc = child;
  child = undefined;

  const exited = new Promise<void>(resolve => proc.once('exit', () => resolve()));
  const exitedWithin = (ms: number) => Promise.race([exited.then(() => true), delay(ms).then(() => false)]);

  proc.stdin.end();
  if (await exitedWithin(GRACEFUL_SHUTDOWN_MS)) return;

  proc.kill('SIGTERM');
  if (await exitedWithin(FORCE_KILL_GRACE_MS)) return;

  proc.kill('SIGKILL');
  await exited;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
