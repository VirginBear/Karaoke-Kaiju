import { describe, expect, it } from 'vitest';
import { DRIVE_APPDATA_SCOPE, configureGoogleDriveOAuth } from './oauth-manifest';

describe('Google Drive OAuth manifest configuration', () => {
  const baseManifest = { manifest_version: 3, name: 'Test', version: '0.0.12' };

  it('keeps OAuth out of ordinary builds when no client id is configured', () => {
    const result = configureGoogleDriveOAuth(baseManifest, undefined);
    expect(result.configured).toBe(false);
    expect(result.manifest).not.toHaveProperty('oauth2');
  });

  it('injects only the appDataFolder scope for a valid Chrome OAuth client', () => {
    const result = configureGoogleDriveOAuth(
      baseManifest,
      '123456-example.apps.googleusercontent.com',
    );
    expect(result.configured).toBe(true);
    expect(result.manifest.oauth2).toEqual({
      client_id: '123456-example.apps.googleusercontent.com',
      scopes: [DRIVE_APPDATA_SCOPE],
    });
  });

  it('stops the build for a malformed client id instead of shipping a broken login', () => {
    expect(() => configureGoogleDriveOAuth(baseManifest, 'not-a-client-id')).toThrow(
      'DIAOCHANG_GOOGLE_OAUTH_CLIENT_ID',
    );
  });
});
