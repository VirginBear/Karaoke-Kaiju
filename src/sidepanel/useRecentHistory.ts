import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EMPTY_RECENT_HISTORY,
  RECENT_HISTORY_STORAGE_KEY,
  clearRecentHistory,
  recordRecentMedia,
  removeRecentTrack,
  type RecentHistory,
} from '../shared/history';
import { normalizeTrackUrl } from '../shared/library';
import type { AudioSessionState, MediaState } from '../shared/protocol';
import { readStoredValue, writeStoredValue } from './storage';

function normalizeHistory(stored: Partial<RecentHistory>): RecentHistory {
  if (stored.schemaVersion !== 1 || !Array.isArray(stored.tracks)) {
    return EMPTY_RECENT_HISTORY;
  }
  return {
    schemaVersion: 1,
    updatedAt: stored.updatedAt ?? 0,
    tracks: stored.tracks
      .filter((track) => Boolean(track?.id && track.url))
      .map((track) => ({
        ...track,
        url: normalizeTrackUrl(track.url),
        lastPlayedAt: track.lastPlayedAt ?? track.addedAt,
        playCount: track.playCount ?? 1,
        practice: {
          ...track.practice,
          loopEnabled: track.practice.loopEnabled ?? false,
        },
      }))
      .sort((left, right) => right.lastPlayedAt - left.lastPlayedAt),
  };
}

export function useRecentHistory(
  media: MediaState,
  audio: AudioSessionState,
  autoSave: boolean,
) {
  const [history, setHistory] = useState<RecentHistory>(EMPTY_RECENT_HISTORY);
  const [loaded, setLoaded] = useState(false);
  const historyRef = useRef(history);

  useEffect(() => {
    let cancelled = false;
    void readStoredValue<Partial<RecentHistory>>(
      RECENT_HISTORY_STORAGE_KEY,
      EMPTY_RECENT_HISTORY,
    ).then((stored) => {
      if (cancelled) {
        return;
      }
      const resolved = normalizeHistory(stored);
      historyRef.current = resolved;
      setHistory(resolved);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: RecentHistory) => {
    historyRef.current = next;
    setHistory(next);
    void writeStoredValue(RECENT_HISTORY_STORAGE_KEY, next);
  }, []);

  const recordCurrent = useCallback(() => {
    if (!media.available) {
      return;
    }
    commit(recordRecentMedia(historyRef.current, media, audio, crypto.randomUUID(), Date.now()));
  }, [
    audio.pitchCents,
    audio.pitchSemitones,
    commit,
    media.artist,
    media.available,
    media.duration,
    media.loop.enabled,
    media.loop.end,
    media.loop.start,
    media.platform,
    media.playbackRate,
    media.title,
    media.url,
  ]);

  useEffect(() => {
    if (!loaded || !autoSave || !media.available) {
      return undefined;
    }
    const timer = window.setTimeout(recordCurrent, 600);
    return () => window.clearTimeout(timer);
  }, [autoSave, loaded, media.available, recordCurrent]);

  return {
    history,
    loaded,
    recordCurrent,
    removeTrack: (trackId: string) =>
      commit(removeRecentTrack(historyRef.current, trackId, Date.now())),
    clearHistory: () => commit(clearRecentHistory()),
  };
}
