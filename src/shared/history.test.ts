import { describe, expect, it } from 'vitest';
import { EMPTY_AUDIO_SESSION, EMPTY_MEDIA_STATE } from './protocol';
import {
  EMPTY_RECENT_HISTORY,
  clearRecentHistory,
  recordRecentMedia,
  removeRecentTrack,
} from './history';

const media = {
  ...EMPTY_MEDIA_STATE,
  available: true,
  title: 'Test song',
  artist: 'Singer',
  platform: 'YouTube',
  url: 'https://www.youtube.com/watch?v=abc123&list=radio',
  duration: 180,
  playbackRate: 0.9,
};

describe('recent history', () => {
  it('records and updates a canonical song without duplicates', () => {
    const first = recordRecentMedia(EMPTY_RECENT_HISTORY, media, EMPTY_AUDIO_SESSION, 'one', 1000);
    const second = recordRecentMedia(
      first,
      { ...media, url: 'https://youtu.be/abc123', playbackRate: 1.1 },
      { ...EMPTY_AUDIO_SESSION, pitchSemitones: 2 },
      'two',
      2000,
    );

    expect(second.tracks).toHaveLength(1);
    expect(second.tracks[0]).toMatchObject({ id: 'one', lastPlayedAt: 2000, playCount: 1 });
    expect(second.tracks[0]?.practice).toMatchObject({ pitchSemitones: 2, speed: 1.1 });
  });

  it('removes one entry and clears all entries', () => {
    const recorded = recordRecentMedia(EMPTY_RECENT_HISTORY, media, EMPTY_AUDIO_SESSION, 'one', 1000);
    expect(removeRecentTrack(recorded, 'one', 2000).tracks).toEqual([]);
    expect(clearRecentHistory(3000)).toMatchObject({ updatedAt: 3000, tracks: [] });
  });
});
