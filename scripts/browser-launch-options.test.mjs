import { describe, expect, it } from 'vitest';
import {
  parseInstalledBrowserPath,
  resolveBrowserLaunchOptions,
} from './browser-launch-options.mjs';

describe('resolveBrowserLaunchOptions', () => {
  it('uses bundled Chromium when no browser override is configured', () => {
    expect(resolveBrowserLaunchOptions({})).toEqual({});
  });

  it('targets the installed Google Chrome channel on Windows and macOS', () => {
    expect(resolveBrowserLaunchOptions({ KARAOKE_KAIJU_BROWSER_CHANNEL: 'chrome' })).toEqual({
      channel: 'chrome',
    });
  });

  it('accepts an explicit executable for a managed test machine', () => {
    expect(resolveBrowserLaunchOptions({
      KARAOKE_KAIJU_BROWSER_EXECUTABLE: '/opt/google/chrome',
    })).toEqual({ executablePath: '/opt/google/chrome' });
  });

  it('rejects ambiguous channel and executable overrides', () => {
    expect(() => resolveBrowserLaunchOptions({
      KARAOKE_KAIJU_BROWSER_CHANNEL: 'chrome',
      KARAOKE_KAIJU_BROWSER_EXECUTABLE: '/opt/google/chrome',
    })).toThrow(/only one/i);
  });
});

describe('parseInstalledBrowserPath', () => {
  it('preserves macOS application paths with spaces', () => {
    expect(parseInstalledBrowserPath(
      'chrome@152.0.7977.54 /tmp/cft/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing\n',
    )).toBe('/tmp/cft/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
  });

  it('preserves Windows executable paths with spaces', () => {
    expect(parseInstalledBrowserPath(
      'chrome@152.0.7977.54 C:\\Users\\runner admin\\cft\\chrome.exe\r\n',
    )).toBe('C:\\Users\\runner admin\\cft\\chrome.exe');
  });

  it('rejects installer output without a Chrome path', () => {
    expect(() => parseInstalledBrowserPath('download failed')).toThrow(/executable/i);
  });
});
