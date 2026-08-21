import { describe, expect, it } from 'vitest';
import { EMPTY_AUDIO_SESSION, EMPTY_MEDIA_STATE } from './protocol';
import {
  EMPTY_PLAYLIST_LIBRARY,
  addMediaToPlaylist,
  createPlaylist,
  removeTrack,
  renamePlaylist,
} from './library';

const media = {
  ...EMPTY_MEDIA_STATE,
  available: true,
  title: 'Palette',
  artist: 'IU',
  platform: 'YouTube',
  url: 'https://www.youtube.com/watch?v=d9IxdwEFk1c',
  duration: 218,
  playbackRate: 0.75,
  loop: { start: 10, end: 20, enabled: true },
};

describe('playlist library', () => {
  it('creates and renames multiple local playlists', () => {
    const created = createPlaylist(EMPTY_PLAYLIST_LIBRARY, ' 高音練習 ', 'p1', 1);
    expect(created.playlists[0]?.name).toBe('高音練習');
    expect(renamePlaylist(created, 'p1', '週末 KTV', 2).playlists[0]?.name).toBe('週末 KTV');
  });

  it('saves the current key, speed and A–B points without duplicating the URL', () => {
    const created = createPlaylist(EMPTY_PLAYLIST_LIBRARY, '我的練唱', 'p1', 1);
    const audio = { ...EMPTY_AUDIO_SESSION, pitchSemitones: 2, pitchCents: -8 };
    const first = addMediaToPlaylist(created, 'p1', media, audio, 't1', 2);
    const updated = addMediaToPlaylist(first, 'p1', media, { ...audio, pitchSemitones: 3 }, 't2', 3);

    expect(updated.playlists[0]?.tracks).toHaveLength(1);
    expect(updated.updatedAt).toBe(3);
    expect(updated.playlists[0]?.tracks[0]?.url).toBe(
      'https://www.youtube.com/watch?v=d9IxdwEFk1c',
    );
    expect(updated.playlists[0]?.tracks[0]?.practice).toMatchObject({
      pitchSemitones: 3,
      pitchCents: -8,
      speed: 0.75,
      loopStart: 10,
      loopEnd: 20,
      loopEnabled: true,
    });
  });

  it('removes YouTube radio parameters so the app owns playlist order', () => {
    const created = createPlaylist(EMPTY_PLAYLIST_LIBRARY, '我的練唱', 'p1', 1);
    const radioMedia = {
      ...media,
      url: 'https://www.youtube.com/watch?v=d9IxdwEFk1c&list=RDd9IxdwEFk1c&start_radio=1',
    };
    const withTrack = addMediaToPlaylist(
      created,
      'p1',
      radioMedia,
      EMPTY_AUDIO_SESSION,
      't1',
      2,
    );
    expect(withTrack.playlists[0]?.tracks[0]?.url).toBe(
      'https://www.youtube.com/watch?v=d9IxdwEFk1c',
    );
  });

  it('removes only the selected track', () => {
    const created = createPlaylist(EMPTY_PLAYLIST_LIBRARY, '我的練唱', 'p1', 1);
    const withTrack = addMediaToPlaylist(created, 'p1', media, EMPTY_AUDIO_SESSION, 't1', 2);
    expect(removeTrack(withTrack, 'p1', 't1', 3).playlists[0]?.tracks).toHaveLength(0);
  });
});
