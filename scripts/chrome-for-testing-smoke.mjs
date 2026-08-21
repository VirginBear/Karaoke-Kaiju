import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseInstalledBrowserPath } from './browser-launch-options.mjs';

const cachePath = process.env.KARAOKE_KAIJU_CFT_CACHE
  ?? join(tmpdir(), 'karaoke-kaiju-chrome-for-testing');
const pnpmExecutable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const installerOutput = execFileSync(
  pnpmExecutable,
  [
    'dlx',
    '@puppeteer/browsers@3.2.1',
    'install',
    'chrome@stable',
    '--path',
    cachePath,
  ],
  {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'inherit'],
  },
);

process.env.KARAOKE_KAIJU_BROWSER_EXECUTABLE = parseInstalledBrowserPath(installerOutput);
await import('./extension-smoke.mjs');
