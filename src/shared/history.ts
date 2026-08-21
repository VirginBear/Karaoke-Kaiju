import { createPlaylistTrack, normalizeTrackUrl, type PlaylistTrack } from './library';
import type { AudioSessionState, MediaState } from './protocol';

export interface RecentTrack extends PlaylistTrack {
  lastPlayedAt: number;
  playCount: number;
}

export interface RecentHistory {
  schemaVersion: 1;
  updatedAt: number;
  tracks: RecentTrack[];
}

export const RECENT_HISTORY_STORAGE_KEY = 'recentHistoryV1';
export const MAX_RECENT_TRACKS = 50;

export const EMPTY_RECENT_HISTORY: RecentHistory = {
  schemaVersion: 1,
  updatedAt: 0,
  tracks: [],
};

export function recordRecentMedia(
  history: RecentHistory,
  media: MediaState,
  audio: AudioSessionState,
  id: string,
  now: number,
): RecentHistory {
  if (!media.available || !media.url) {
    return history;
  }

  const track = createPlaylistTrack(media, audio, id, now);
  const existing = history.tracks.find(
    (item) => normalizeTrackUrl(item.url) === normalizeTrackUrl(track.url),
  );
  const recentTrack: RecentTrack = {
    ...track,
    id: existing?.id ?? track.id,
    addedAt: existing?.addedAt ?? track.addedAt,
    lastPlayedAt: now,
    playCount:
      existing === undefined
        ? 1
        : existing.playCount + (now - existing.lastPlayedAt >= 30_000 ? 1 : 0),
  };

  return {
    schemaVersion: 1,
    updatedAt: now,
    tracks: [
      recentTrack,
      ...history.tracks.filter((item) => item.id !== recentTrack.id),
    ].slice(0, MAX_RECENT_TRACKS),
  };
}

export function removeRecentTrack(
  history: RecentHistory,
  trackId: string,
  now: number,
): RecentHistory {
  return {
    ...history,
    updatedAt: now,
    tracks: history.tracks.filter((track) => track.id !== trackId),
  };
}

export function clearRecentHistory(now = Date.now()): RecentHistory {
  return { ...EMPTY_RECENT_HISTORY, updatedAt: now };
}
