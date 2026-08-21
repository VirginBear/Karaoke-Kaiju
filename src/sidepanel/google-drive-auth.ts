import { DRIVE_APPDATA_SCOPE } from '../shared/oauth-manifest';
import { isExtensionRuntime } from './client';

const DRIVE_API_ORIGIN = 'https://www.googleapis.com/*';

export function isGoogleDriveOAuthConfigured(): boolean {
  if (!isExtensionRuntime()) return false;
  const manifest = chrome.runtime.getManifest() as chrome.runtime.Manifest & {
    oauth2?: { client_id?: string; scopes?: string[] };
  };
  return Boolean(
    manifest.oauth2?.client_id && manifest.oauth2.scopes?.includes(DRIVE_APPDATA_SCOPE),
  );
}

export async function getGoogleDriveToken(interactive: boolean): Promise<string> {
  if (!isGoogleDriveOAuthConfigured()) {
    throw new Error('這個版本尚未設定 Google Drive OAuth，請先完成開發者設定');
  }

  const hasOrigin = await chrome.permissions.contains({ origins: [DRIVE_API_ORIGIN] });
  if (!hasOrigin) {
    if (!interactive) throw new Error('請重新連動 Google Drive 以允許同步權限');
    const granted = await chrome.permissions.request({ origins: [DRIVE_API_ORIGIN] });
    if (!granted) throw new Error('你尚未允許 Google Drive API 權限');
  }

  const result = await chrome.identity.getAuthToken({ interactive });
  const token = typeof result === 'string' ? result : result?.token;
  if (!token) throw new Error('無法取得 Google 帳號授權，請重新連動');
  return token;
}
