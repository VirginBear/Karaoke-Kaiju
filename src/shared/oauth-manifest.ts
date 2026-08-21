export const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export interface ExtensionManifestLike extends Record<string, unknown> {
  oauth2?: {
    client_id: string;
    scopes: string[];
  };
}

export interface OAuthManifestResult {
  configured: boolean;
  manifest: ExtensionManifestLike;
}

const CHROME_OAUTH_CLIENT_ID = /^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/;

export function configureGoogleDriveOAuth(
  manifest: ExtensionManifestLike,
  rawClientId: string | undefined,
): OAuthManifestResult {
  const clientId = rawClientId?.trim();
  if (!clientId) {
    return { configured: false, manifest: { ...manifest } };
  }
  if (!CHROME_OAUTH_CLIENT_ID.test(clientId)) {
    throw new Error(
      'DIAOCHANG_GOOGLE_OAUTH_CLIENT_ID 必須是 Chrome 擴充功能的 OAuth Client ID',
    );
  }
  return {
    configured: true,
    manifest: {
      ...manifest,
      oauth2: {
        client_id: clientId,
        scopes: [DRIVE_APPDATA_SCOPE],
      },
    },
  };
}
