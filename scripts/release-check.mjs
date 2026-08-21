import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const errors = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};
const readText = (path) => readFile(resolve(root, path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const packageJson = await readJson('package.json');
const sourceManifest = await readJson('public/manifest.json');
const builtManifest = await readJson('dist/manifest.json');
const website = await readText('website/index.html');
const thirdPartyNotices = await readText('public/THIRD_PARTY_NOTICES.txt');

assert(packageJson.version === sourceManifest.version, 'package.json and public/manifest.json versions must match');
assert(packageJson.version === builtManifest.version, 'package.json and dist/manifest.json versions must match');
assert(/^\d+\.\d+\.\d+$/.test(packageJson.version), `invalid release version: ${packageJson.version}`);
assert(!('oauth2' in builtManifest), 'public build must not contain Google Drive OAuth configuration');
assert(!('optional_host_permissions' in builtManifest), 'public build must not declare experimental API origins');
assert(!('optional_host_permissions' in sourceManifest), 'source manifest must default to the public least-privilege policy');
assert(!builtManifest.host_permissions?.some((origin) => origin.includes('googlevideo.com')), 'public build must not request the experimental Googlevideo stream origin');
assert(website.includes(`v${packageJson.version}`), 'official website version must match the extension version');
assert(!website.includes('Karaoke-Controller'), 'official website must use the current Karaoke-Kaiju repository URL');
assert(!website.includes('../docs/'), 'GitHub Pages must not contain links outside the deployed website artifact');
assert(!/(BPM|Groq|人聲分離|AI 歌詞實驗中)/i.test(website), 'official website must not advertise hidden experimental tools');
assert(thirdPartyNotices.includes('MPL-2.0') && thirdPartyNotices.includes('SoundTouchJS'), 'public package must include SoundTouchJS MPL notices');

const trackedOrPublishable = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { cwd: root },
).toString('utf8').split('\0').filter(Boolean);

const forbiddenPaths = trackedOrPublishable.filter((path) =>
  path === '.DS_Store' ||
  path.startsWith('dist/') ||
  path.startsWith('release/') ||
  path.startsWith('docs/private/') ||
  (/^\.env(?:\.|$)/.test(path) && path !== '.env.example') ||
  /\.(?:pem|p12|pfx|key|keystore|sqlite|sqlite3|db)$/i.test(path),
);
assert(forbiddenPaths.length === 0, `private or generated paths are publishable: ${forbiddenPaths.join(', ')}`);

const textExtensions = new Set([
  '', '.css', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const secretPatterns = [
  { label: 'Groq API key', pattern: new RegExp(`${'gsk' + '_'}[A-Za-z0-9]{20,}`) },
  { label: 'Google API key', pattern: new RegExp(`${'AIza'}[A-Za-z0-9_-]{30,}`) },
  { label: 'GitHub classic token', pattern: new RegExp(`${'ghp' + '_'}[A-Za-z0-9]{30,}`) },
  { label: 'GitHub fine-grained token', pattern: new RegExp(`${'github' + '_pat_'}[A-Za-z0-9_]{30,}`) },
  { label: 'private key block', pattern: new RegExp(`${'-----BEGIN '}(?:RSA |EC |OPENSSH )?PRIVATE KEY-----`) },
];

for (const path of trackedOrPublishable) {
  if (!textExtensions.has(extname(path).toLowerCase())) continue;
  const fileStat = await stat(resolve(root, path));
  if (fileStat.size > 2_000_000) continue;
  const content = await readText(path);
  for (const secret of secretPatterns) {
    if (secret.pattern.test(content)) errors.push(`${secret.label} pattern found in ${path}`);
  }
}

if (errors.length > 0) {
  console.error(JSON.stringify({ status: 'FAIL', errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS',
  version: packageJson.version,
  releaseChannel: 'public',
  optionalApiOrigins: 0,
  scannedFiles: trackedOrPublishable.length,
}, null, 2));
