import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptsDir, '..');
const staticDir = path.join(frontendRoot, 'storybook-static');
const outputDir = path.resolve(frontendRoot, '..', 'crowdin', 'screenshots');

/**
 * Storybook stories worth sending to Crowdin as translator context, and the basename each is
 * uploaded under — `crowdin screenshot upload` upserts on that basename, so renaming one here
 * orphans the old screenshot rather than replacing it.
 */
const targets = [
  { id: 'app-pages-main-menu-menu-items-list--normal', name: 'main-menu' },
  { id: 'app-pages-main-menu-menu-items-list--signed-out', name: 'main-menu-signed-out' },
  { id: 'app-pages-case-files--short-list', name: 'case-files-list' },
  { id: 'app-pages-case-files--empty', name: 'case-files-empty' },
  { id: 'app-pages-case-files--failure', name: 'case-files-error' },
  { id: 'app-pages-case-files--loading', name: 'case-files-loading' },
  { id: 'app-features-auth-sign-in--choice', name: 'sign-in-choice' },
  { id: 'app-features-auth-sign-in--credentials', name: 'sign-in-credentials' },
  { id: 'app-features-settings-account--anonymous', name: 'settings-account-anonymous' },
  { id: 'app-features-settings-account--permanent', name: 'settings-account-permanent' },
  { id: 'app-features-settings-account--signed-out', name: 'settings-account-signed-out' },
];

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

function readStoryIndex() {
  const indexFile = path.join(staticDir, 'index.json');

  if (!fs.existsSync(indexFile)) {
    throw new Error(`No Storybook build at ${staticDir}. Run \`npm run build-storybook\` first.`);
  }

  return new Set(Object.keys(JSON.parse(fs.readFileSync(indexFile, 'utf8')).entries));
}

export async function capture({ log = console.log } = {}) {
  const known = readStoryIndex();
  const unknown = targets.filter(target => !known.has(target.id)).map(target => target.id);

  if (unknown.length > 0) {
    throw new Error(`Stories missing from the Storybook build: ${unknown.join(', ')}. The build is stale — re-run \`npm run build-storybook\`.`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const { server, port } = await serve(staticDir);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

    for (const { id, name } of targets) {
      await page.goto(`http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story`, { waitUntil: 'networkidle' });

      // `attached`, not `visible`: the dialog-hosted stories project into a `position: fixed`
      // dialog, which leaves the story wrapper zero-height and therefore "hidden" to Playwright
      // even though the content paints. The settle covers play functions and CSS transitions.
      await page.waitForSelector('#storybook-root > *', { state: 'attached', timeout: 15_000 });
      await page.waitForTimeout(700);

      const file = path.join(outputDir, `${name}.png`);
      await page.screenshot({ path: file });
      log(`${name}.png ← ${id}`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  return targets.map(target => path.join(outputDir, `${target.name}.png`));
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const files = await capture();
  console.log(`\n${files.length} screenshots in ${outputDir}`);
  console.log('Upload with (needs CROWDIN_PROJECT_ID and CROWDIN_PERSONAL_TOKEN):');
  console.log('  npm run i18n:screenshots:upload');
}
