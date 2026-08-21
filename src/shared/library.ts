import type { AudioSessionState, MediaState, PlaybackTrack } from './protocol';

export type PlaylistTrack = PlaybackTrack;

export interface PracticePlaylist {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  tracks: PlaylistTrack[];
}

export interface PlaylistLibrary {
  schemaVersion: 1;
  updatedAt: number;
  playlists: PracticePlaylist[];
}

export const PLAYLIST_LIBRARY_STORAGE_KEY = 'playlistLibraryV1';

export const EMPTY_PLAYLIST_LIBRARY: PlaylistLibrary = {
  schemaVersion: 1,
  updatedAt: 0,
  playlists: [],
};

export function createPlaylist(
  library: PlaylistLibrary,
  name: string,
  id: string,
  now: number,
): PlaylistLibrary {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return library;
  }

  return {
    ...library,
    updatedAt: now,
    playlists: [
      ...library.playlists,
      {
        id,
        name: normalizedName,
        createdAt: now,
        updatedAt: now,
        tracks: [],
      },
    ],
  };
}

export function renamePlaylist(
  library: PlaylistLibrary,
  playlistId: string,
  name: string,
  now: number,
): PlaylistLibrary {
  const normalizedName = name.trim();
  if (!normalizedName) {
    return library;
  }

  return {
    ...library,
    updatedAt: now,
    playlists: library.playlists.map((playlist) =>
      playlist.id === playlistId
        ? { ...playlist, name: normalizedName, updatedAt: now }
        : playlist,
    ),
  };
}

export function deletePlaylist(
  library: PlaylistLibrary,
  playlistId: string,
  now = Date.now(),
): PlaylistLibrary {
  return {
    ...library,
    updatedAt: now,
    playlists: library.playlists.filter((playlist) => playlist.id !== playlistId),
  };
}

export function addMediaToPlaylist(
  library: PlaylistLibrary,
  playlistId: string,
  media: MediaState,
  audio: AudioSessionState,
  trackId: string,
  now: number,
): PlaylistLibrary {
  if (!media.available || !media.url) {
    return library;
  }

  const track = createPlaylistTrack(media, audio, trackId, now);
  return addTrackToPlaylist(library, playlistId, track, now);
}

export function addTrackToPlaylist(
  library: PlaylistLibrary,
  playlistId: string,
  track: PlaylistTrack,
  now: number,
): PlaylistLibrary {
  return {
    ...library,
    updatedAt: now,
    playlists: library.playlists.map((playlist) => {
      if (playlist.id !== playlistId) {
        return playlist;
      }

      const existingIndex = playlist.tracks.findIndex(
        (item) => normalizeTrackUrl(item.url) === normalizeTrackUrl(track.url),
      );
      const tracks =
        existingIndex === -1
          ? [...playlist.tracks, track]
          : playlist.tracks.map((item, index) =>
              index === existingIndex ? { ...track, id: item.id, addedAt: item.addedAt } : item,
            );
      return { ...playlist, tracks, updatedAt: now };
    }),
  };
}

export function removeTrack(
  library: PlaylistLibrary,
  playlistId: string,
  trackId: string,
  now: number,
): PlaylistLibrary {
  return {
    ...library,
    updatedAt: now,
    playlists: library.playlists.map((playlist) =>
      playlist.id === playlistId
        ? {
            ...playlist,
            tracks: playlist.tracks.filter((track) => track.id !== trackId),
            updatedAt: now,
          }
        : playlist,
    ),
  };
}

export function createPlaylistTrack(
  media: MediaState,
  audio: AudioSessionState,
  id: string,
  addedAt: number,
): PlaylistTrack {
  return {
    id,
    url: normalizeTrackUrl(media.url),
    title: media.title,
    artist: media.artist,
    platform: media.platform,
    duration: media.duration,
    addedAt,
    practice: {
      pitchSemitones: audio.pitchSemitones,
      pitchCents: audio.pitchCents,
      speed: media.playbackRate,
      loopStart: media.loop.start,
      loopEnd: media.loop.end,
      loopEnabled: media.loop.enabled,
    },
  };
}

export function normalizeTrackUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : rawUrl;
    }

    if (
      (url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com')) &&
      url.pathname === '/watch'
    ) {
      const videoId = url.searchParams.get('v');
      return videoId ? `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}` : rawUrl;
    }

    url.hash = '';
    return url.toString();
  } catch {
    return rawUrl;
  }
}

export function getTrackThumbnailUrl(rawUrl: string): string | null {
  try {
    const url = new URL(normalizeTrackUrl(rawUrl));
    if (url.hostname === 'www.youtube.com' && url.pathname === '/watch') {
      const videoId = url.searchParams.get('v');
      return videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg` : null;
    }
  } catch {
    // A non-URL media source has no derived thumbnail.
  }
  return null;
}

export function exportPlaylistShareCode(playlist: PracticePlaylist): string {
  const payload = {
    diaochangPlaylistVersion: 1,
    name: playlist.name,
    tracks: playlist.tracks.map((t) => ({
      title: t.title,
      artist: t.artist,
      platform: t.platform,
      url: t.url,
      duration: t.duration,
      practice: t.practice,
    })),
  };
  return `diaochang://playlist/${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
}

export function parsePlaylistShareCode(code: string): { name: string; tracks: PlaylistTrack[] } | null {
  try {
    let raw = code.trim();
    if (raw.startsWith('diaochang://playlist/')) {
      raw = raw.replace('diaochang://playlist/', '');
    }
    const json = decodeURIComponent(escape(atob(raw)));
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.tracks)) return null;
    return {
      name: parsed.name || '分享的歌單',
      tracks: parsed.tracks.map((t: any) => ({
        id: `shared-track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: t.title || '未知歌曲',
        artist: t.artist || '未知歌手',
        platform: t.platform || 'YouTube',
        url: t.url || '',
        duration: t.duration || 0,
        addedAt: Date.now(),
        practice: {
          pitchSemitones: t.practice?.pitchSemitones ?? 0,
          pitchCents: t.practice?.pitchCents ?? 0,
          speed: t.practice?.speed ?? 1.0,
          loopStart: t.practice?.loopStart ?? null,
          loopEnd: t.practice?.loopEnd ?? null,
          loopEnabled: t.practice?.loopEnabled ?? false,
        },
      })),
    };
  } catch {
    return null;
  }
}

