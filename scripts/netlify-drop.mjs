// Turns a Netlify-preset build into a plain static site for Netlify (Git deploys and drag-and-drop):
// - writes a client-rendered start page (dist/index.html) and sends every page path to it;
// - forwards images (/__l5e/*) and game/server requests (/_serverFn/*) to the published Lovable app,
//   which holds the game server key, so cash tables work on Netlify too;
// - removes the Netlify server function, which has no game key and would take over every page.
// Run via `npm run build:netlify-drop` (netlify.toml does this automatically).
import { rmSync, writeFileSync, readFileSync } from 'node:fs';
import { LOVABLE_APP_ORIGIN } from './netlify-assets.mjs';

// Netlify does not load .env files into process.env — only dashboard/toml env vars are set.
// Vite reads .env during the build, but this post-build Node script does not. Load .env as
// a fallback so the checks below pass even when the vars are not in the Netlify environment.
try {
  const envFile = readFileSync('.env', 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
} catch {
  // No .env — rely on Netlify environment variables instead.
}

const missingEnv = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'].filter((name) => !process.env[name]);
if (missingEnv.length > 0) {
  throw new Error(`Netlify build is missing ${missingEnv.join(', ')}; the site would open to an error page. Add them in Netlify's environment variables or a .env file.`);
}

process.env.TSS_PRERENDERING = 'true';
const { default: handler } = await import('../.netlify/functions-internal/server/main.mjs');
const res = await handler(new Request('http://localhost/', { headers: { 'X-TSS_SHELL': 'true' } }), {});
if (!res.ok) throw new Error(`Start page render failed: ${res.status}`);
const html = await res.text();
if (!html.includes('<script')) throw new Error('Start page has no scripts; the site would be blank.');
writeFileSync('dist/index.html', html);
writeFileSync(
  'dist/_redirects',
  [
    `/__l5e/*  ${LOVABLE_APP_ORIGIN}/__l5e/:splat  200`,
    `/_serverFn/*  ${LOVABLE_APP_ORIGIN}/_serverFn/:splat  200`,
    `/*  /index.html  200`,
    '',
  ].join('\n'),
);
rmSync('.netlify/functions-internal', { recursive: true, force: true });
rmSync('.netlify/v1', { recursive: true, force: true });
console.log(`Netlify site ready in dist/ (server requests go to ${LOVABLE_APP_ORIGIN})`);
