import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readText = (path) => readFile(resolve(root, path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const expectedName = 'Karaoke Kaiju';
const locales = ['zh_TW', 'en', 'ja', 'zh_CN'];

const errors = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};
const tryReadText = async (path) => {
  try {
    return await readText(path);
  } catch (error) {
    errors.push(`${path} could not be read: ${error instanceof Error ? error.message : String(error)}`);
    return '';
  }
};
const tryReadFile = async (path) => {
  try {
    return await readFile(resolve(root, path));
  } catch (error) {
    errors.push(`${path} could not be read: ${error instanceof Error ? error.message : String(error)}`);
    return Buffer.alloc(0);
  }
};

const packageJson = await readJson('package.json');
const manifest = await readJson('public/manifest.json');
const expectedVersion = packageJson.version;

assert(packageJson.name === 'karaoke-kaiju', `package name must be karaoke-kaiju, got ${packageJson.name}`);
assert(packageJson.version === expectedVersion, `package version must be ${expectedVersion}, got ${packageJson.version}`);
assert(manifest.version === expectedVersion, `manifest version must be ${expectedVersion}, got ${manifest.version}`);
assert(manifest.name === '__MSG_extensionName__', 'manifest name must remain localized');
assert(manifest.short_name === '__MSG_extensionShortName__', 'manifest short_name must remain localized');

for (const locale of locales) {
  const messages = await readJson(`public/_locales/${locale}/messages.json`);
  assert(messages.extensionName?.message === expectedName, `${locale} extensionName must be ${expectedName}`);
  assert(messages.extensionShortName?.message === 'Kaiju', `${locale} extensionShortName must be Kaiju`);
  assert(messages.actionTitle?.message?.includes(expectedName), `${locale} actionTitle must include ${expectedName}`);
}

for (const path of ['public/brand/karaoke-kaiju-mark.svg', 'public/brand/karaoke-kaiju-app-icon.svg']) {
  const svg = await tryReadText(path);
  assert(/viewBox="0 0 128 128"/.test(svg), `${path} must use a 128 × 128 viewBox`);
  assert(!/<(?:linear|radial)Gradient\b/i.test(svg), `${path} must not contain gradients`);
  assert(!/filter=|<filter\b|drop-shadow/i.test(svg), `${path} must not contain filters or shadows`);
  assert(svg.includes('#111827'), `${path} must include deep navy #111827`);
  assert(svg.includes('#0A84FF'), `${path} must include system blue #0A84FF`);
}

for (const asset of ['karaoke-kaiju-mark.svg', 'karaoke-kaiju-app-icon.svg']) {
  const extensionAsset = await tryReadFile(`public/brand/${asset}`);
  const websiteAsset = await tryReadFile(`website/assets/${asset}`);
  assert(extensionAsset.equals(websiteAsset), `website/assets/${asset} must match the extension brand master`);
}

for (const size of [16, 32, 48, 128]) {
  const png = await tryReadFile(`public/icons/icon-${size}.png`);
  assert(png.toString('ascii', 1, 4) === 'PNG', `icon-${size}.png must be a PNG`);
  assert(png.length >= 26 && png.readUInt32BE(16) === size, `icon-${size}.png width must be ${size}`);
  assert(png.length >= 26 && png.readUInt32BE(20) === size, `icon-${size}.png height must be ${size}`);
  assert(png.length >= 26 && png[25] === 6, `icon-${size}.png must use RGBA color type 6`);
}

const website = await readText('website/index.html');
const websiteText = website.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
assert(website.includes('<title>Karaoke Kaiju'), 'website title must start with Karaoke Kaiju');
assert(websiteText.includes('找到你的 Key， 唱出你的歌。'), 'website hero must use the accepted Traditional Chinese headline');
assert(website.includes('0.1.0 公開測試版；尚未於 Chrome Web Store 正式發布。'), 'website must disclose public-beta status');
assert(!website.includes('chromewebstore.google.com'), 'website must not link to an unpublished Chrome Web Store listing');

const sidePanelI18n = await readText('src/sidepanel/i18n.tsx');
assert((sidePanelI18n.match(/appName:\s*'Karaoke Kaiju'/g) ?? []).length === 4, 'all four side-panel locales must use Karaoke Kaiju');

const headerStatus = await readText('src/sidepanel/components/HeaderStatus.tsx');
assert(headerStatus.includes('/brand/karaoke-kaiju-app-icon.svg'), 'side-panel header must use the approved compact app icon');

const publicBrandFiles = [
  'README.md',
  'docs/PROJECT_SPEC.md',
  'docs/PRIVACY_POLICY.md',
  'docs/USER_MANUAL.md',
  'docs/CHROME_WEB_STORE_GUIDE.md',
  'website/index.html',
];

for (const path of publicBrandFiles) {
  const content = await readText(path);
  assert(content.includes(expectedName), `${path} must include the approved brand name`);
}

if (errors.length > 0) {
  console.error(JSON.stringify({ status: 'FAIL', errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'PASS',
  brand: expectedName,
  version: expectedVersion,
  locales,
  iconSizes: [16, 32, 48, 128],
}, null, 2));
