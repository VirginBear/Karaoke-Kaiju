import { describe, expect, it, vi } from 'vitest';
import { createDriveSyncDocument } from '../shared/google-drive-sync';
import { EMPTY_PLAYLIST_LIBRARY } from '../shared/library';
import { EMPTY_LYRICS_LIBRARY } from '../shared/lyrics';
import {
  DRIVE_SYNC_FILE_NAME,
  deleteDriveSyncFile,
  readDriveSyncFile,
  writeDriveSyncFile,
} from './google-drive-api';

describe('Google Drive appDataFolder API', () => {
  const document = createDriveSyncDocument(
    EMPTY_PLAYLIST_LIBRARY,
    EMPTY_LYRICS_LIBRARY,
    10,
  );

  it('limits lookup and download to the hidden appDataFolder space', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [{ id: 'drive-file-1' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify(document), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

    const result = await readDriveSyncFile('oauth-token', fetcher);

    expect(result).toEqual({ fileId: 'drive-file-1', document });
    const lookupUrl = String(fetcher.mock.calls[0]?.[0]);
    expect(lookupUrl).toContain('spaces=appDataFolder');
    expect(decodeURIComponent(lookupUrl)).toContain(`name='${DRIVE_SYNC_FILE_NAME}'`);
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer oauth-token' },
    });
  });

  it('creates metadata in appDataFolder before uploading a new snapshot', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'created-file' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));

    await expect(writeDriveSyncFile('oauth-token', null, document, fetcher)).resolves.toBe(
      'created-file',
    );

    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      name: DRIVE_SYNC_FILE_NAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
    });
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      method: 'PATCH',
      body: JSON.stringify(document),
    });
  });

  it('surfaces Drive API failures instead of reporting a successful sync', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Drive quota unavailable' } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(readDriveSyncFile('oauth-token', fetcher)).rejects.toThrow(
      'Drive quota unavailable',
    );
  });

  it('deletes only the resolved app-data file when the user requests removal', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteDriveSyncFile('oauth-token', 'drive-file-1', fetcher)).resolves.toBeUndefined();

    expect(fetcher).toHaveBeenCalledWith(
      'https://www.googleapis.com/drive/v3/files/drive-file-1',
      {
        method: 'DELETE',
        headers: { Authorization: 'Bearer oauth-token' },
      },
    );
  });
});
