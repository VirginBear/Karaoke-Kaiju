import { describe, expect, it } from 'vitest';
import { EMPTY_LYRICS_LIBRARY, createSongLyrics, upsertLyrics } from './lyrics';
import {
  LYRICS_SYNC_CHUNK_PREFIX,
  decodeLyricsLibrary,
  encodeLyricsLibrary,
} from './sync-lyrics';

function createLibrary(text = '準備唱下一句') {
  const entry = createSongLyrics({
    id: 'lyrics-1',
    trackUrl: 'https://www.youtube.com/watch?v=test123',
    title: '測試歌曲',
    artist: 'Karaoke Kaiju QA',
    source: 'lrc',
    sourceLabel: 'test.lrc',
    now: 123,
    lines: [{ id: 'line-1', text, start: 1, end: 4, words: [] }],
  });
  return upsertLyrics(EMPTY_LYRICS_LIBRARY, entry);
}

describe('lyrics sync codec', () => {
  it('round-trips lyrics and presentation settings', () => {
    const library = createLibrary();
    const encoded = encodeLyricsLibrary(library);
    expect(decodeLyricsLibrary(encoded.values)).toEqual(library);
  });

  it('splits a larger lyric payload into Chrome Sync-safe chunks', () => {
    const encoded = encodeLyricsLibrary(createLibrary('唱'.repeat(9000)));
    expect(Object.keys(encoded.values).filter((key) => key.startsWith(LYRICS_SYNC_CHUNK_PREFIX)).length)
      .toBeGreaterThan(1);
    expect(decodeLyricsLibrary(encoded.values)).toEqual(createLibrary('唱'.repeat(9000)));
  });

  it('rejects incomplete lyric sync data', () => {
    const encoded = encodeLyricsLibrary(createLibrary());
    delete encoded.values[`${LYRICS_SYNC_CHUNK_PREFIX}0`];
    expect(decodeLyricsLibrary(encoded.values)).toBeNull();
  });
});
