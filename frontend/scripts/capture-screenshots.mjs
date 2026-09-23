import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { flattenEntries } from './i18n-langs.mjs';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptsDir, '..');
const staticDir = path.join(frontendRoot, 'storybook-static');
const appDir = path.join(frontendRoot, 'src', 'app');
const outputDir = path.resolve(frontendRoot, '..', 'crowdin', 'screenshots');

/** Layers that can render translatable text. `ui/kit` primitives take their text as an input. */
const inScope = /^app\/(pages|features|core)\//;

/** Below this, a match is more likely a coincidence than the string being on screen. */
const minimumMatchLength = 6;

const contentTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

function serve(root) {
  const server = http.createServer((request, response) => {
    const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filePath = path.join(root, requested === '/' ? 'index.html' : requested);

    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404).end();
      return;
    }

    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(response);
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

/**
 * Interpolations and symbol markup never reach the screen verbatim, so a string is matched on its
 * longest literal run rather than whole.
 */
function literalRuns(value) {
  return String(value)
    .split(/\{\{[^}]*\}\}|[#@][^#@]*[#@]|\\n/)
    .map(part => part.trim())
    .filter(part => part.length >= minimumMatchLength);
}

/** Every `en.json` under `src/app` — one per scope. */
function findSourceFiles(root) {
  const found = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(entryPath);
      else if (entry.isFile() && entry.name === 'en.json') found.push(entryPath);
    }
  }

  walk(root);
  return found;
}

function readStories() {
  const indexFile = path.join(staticDir, 'index.json');

  if (!fs.existsSync(indexFile)) {
    throw new Error(`No Storybook build at ${staticDir}. Run \`npm run build-storybook\` first.`);
  }

  return Object.values(JSON.parse(fs.readFileSync(indexFile, 'utf8')).entries)
    .filter(entry => entry.type === 'story' && inScope.test(entry.title))
    .map(entry => ({ id: entry.id, name: entry.id.replace(/^app-/, '') }));
}

export async function capture({ log = console.log } = {}) {
  const stories = readStories();
  const phrases = findSourceFiles(appDir)
    .flatMap(file => [...flattenEntries(JSON.parse(fs.readFileSync(file, 'utf8'))).values()])
    .flatMap(literalRuns);

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const { server, port } = await serve(staticDir);
  const browser = await chromium.launch();
  const kept = [];
  const seen = new Set();

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

    for (const { id, name } of stories) {
      await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story`, { waitUntil: 'networkidle' });

      // `attached`, not `visible`: the dialog-hosted stories project into a `position: fixed`
      // dialog, which leaves the story wrapper zero-height and therefore "hidden" to Playwright
      // even though the content paints. The settle covers play functions and CSS transitions.
      await page.waitForSelector('#storybook-root > *', { state: 'attached', timeout: 15_000 }).catch(() => undefined);
      await page.waitForTimeout(500);

      const rendered = await page.evaluate(() => document.body.innerText ?? '');
      const shown = phrases.filter(phrase => rendered.includes(phrase));

      // A screenshot of a screen with no translatable text is clutter in Crowdin: it can never
      // auto-tag anything. Which stories qualify is therefore discovered, never listed.
      if (shown.length === 0) continue;

      // Story variants that differ only visually — eleven agenda percentages, four faction
      // colours — show the same strings and would upload as eleven identical contexts. One
      // screenshot per distinct set of strings; the first story in index order wins.
      const signature = [...new Set(shown)].sort().join('\n');
      if (seen.has(signature)) continue;
      seen.add(signature);

      const file = path.join(outputDir, `${name}.png`);
      await page.screenshot({ path: file });
      kept.push({ name, matches: shown.length });
      log(`${name}.png — ${shown.length} source strings on screen`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  log(`\n${kept.length} of ${stories.length} stories carry translatable text`);
  return kept;
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const kept = await capture();
  if (kept.length === 0) {
    console.error('No screenshots captured — is the Storybook build current?');
    process.exitCode = 1;
  }
}
