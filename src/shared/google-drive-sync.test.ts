import { describe, expect, it } from 'vitest';
import { createPlaylist, EMPTY_PLAYLIST_LIBRARY } from './library';
import { EMPTY_LYRICS_LIBRARY } from './lyrics';
import {
  chooseDriveSyncDirection,
  createDriveSyncDocument,
  mergeDriveSyncPayload,
  parseDriveSyncDocument,
} from './google-drive-sync';

describe('Google Drive sync document', () => {
  it('round-trips playlists and lyrics with Traditional Chinese content', () => {
    const playlists = createPlaylist(
      EMPTY_PLAYLIST_LIBRARY,
      '每日練唱與高音練習',
      'playlist-1',
      123,
    );
    const lyrics = {
      ...EMPTY_LYRICS_LIBRARY,
      updatedAt: 456,
      entries: [
        {
          id: 'lyrics-1',
          trackUrl: 'https://www.youtube.com/watch?v=test',
          title: '花香',
          artist: '許紹洋',
          source: 'manual' as const,
          sourceLabel: '個人校正',
          offsetMs: 100,
          visible: true,
          fontScale: 1,
          panelOpacity: 0.55,
          verticalOffset: 0,
          leadTimeSeconds: 1.5,
          createdAt: 456,
          updatedAt: 456,
          lines: [{ id: 'line-1', text: '風沒有方向的吹來', start: 12, end: 16, words: [] }],
        },
      ],
    };

    const document = createDriveSyncDocument(playlists, lyrics, 500);

    expect(parseDriveSyncDocument(JSON.stringify(document))).toEqual(document);
    expect(document.updatedAt).toBe(500);
  });

  it('rejects a document whose payload was changed without updating its checksum', () => {
    const document = createDriveSyncDocument(
      createPlaylist(EMPTY_PLAYLIST_LIBRARY, '原始歌單', 'playlist-1', 100),
      EMPTY_LYRICS_LIBRARY,
      100,
    );
    const tampered = {
      ...document,
      payload: {
        ...document.payload,
        playlists: createPlaylist(EMPTY_PLAYLIST_LIBRARY, '被竄改', 'playlist-2', 200),
      },
    };

    expect(parseDriveSyncDocument(JSON.stringify(tampered))).toBeNull();
  });

  it('chooses the newer source without overwriting equal snapshots', () => {
    expect(chooseDriveSyncDirection(200, null)).toBe('upload');
    expect(chooseDriveSyncDirection(200, 300)).toBe('download');
    expect(chooseDriveSyncDirection(300, 200)).toBe('upload');
    expect(chooseDriveSyncDirection(300, 300)).toBe('none');
  });

  it('merges playlists and lyrics independently across two computers', () => {
    const localPlaylists = createPlaylist(EMPTY_PLAYLIST_LIBRARY, '本機舊歌單', 'local', 100);
    const remotePlaylists = createPlaylist(EMPTY_PLAYLIST_LIBRARY, '雲端新歌單', 'remote', 300);
    const localLyrics = { ...EMPTY_LYRICS_LIBRARY, updatedAt: 400 };
    const remoteLyrics = { ...EMPTY_LYRICS_LIBRARY, updatedAt: 200 };

    const merged = mergeDriveSyncPayload(
      { playlists: localPlaylists, lyrics: localLyrics },
      { playlists: remotePlaylists, lyrics: remoteLyrics },
    );

    expect(merged.payload.playlists).toEqual(remotePlaylists);
    expect(merged.payload.lyrics).toEqual(localLyrics);
    expect(merged.applyRemotePlaylistsLocally).toBe(true);
    expect(merged.applyRemoteLyricsLocally).toBe(false);
    expect(merged.uploadMergedSnapshot).toBe(true);
  });
});
