import { describe, expect, it } from 'vitest';
import { createPlaylist, EMPTY_PLAYLIST_LIBRARY } from './library';
import {
  PLAYLIST_SYNC_CHUNK_PREFIX,
  decodePlaylistLibrary,
  encodePlaylistLibrary,
} from './sync-library';

describe('playlist sync codec', () => {
  it('round-trips Traditional Chinese playlist data', () => {
    const library = createPlaylist(EMPTY_PLAYLIST_LIBRARY, '每日練唱與高音練習', 'p1', 123);
    const encoded = encodePlaylistLibrary(library);
    expect(decodePlaylistLibrary(encoded.values)).toEqual(library);
  });

  it('splits larger payloads into Chrome Sync-safe chunks', () => {
    const library = createPlaylist(
      EMPTY_PLAYLIST_LIBRARY,
      `長歌單${'唱'.repeat(7000)}`,
      'p1',
      456,
    );
    const encoded = encodePlaylistLibrary(library);
    const chunkCount = Object.keys(encoded.values).filter((key) =>
      key.startsWith(PLAYLIST_SYNC_CHUNK_PREFIX),
    ).length;
    expect(chunkCount).toBeGreaterThan(1);
    expect(decodePlaylistLibrary(encoded.values)).toEqual(library);
  });

  it('rejects incomplete synced data', () => {
    const library = createPlaylist(EMPTY_PLAYLIST_LIBRARY, '我的練唱', 'p1', 1);
    const encoded = encodePlaylistLibrary(library);
    delete encoded.values[`${PLAYLIST_SYNC_CHUNK_PREFIX}0`];
    expect(decodePlaylistLibrary(encoded.values)).toBeNull();
  });
});
