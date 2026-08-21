import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EMPTY_LYRICS_LIBRARY,
  LYRICS_LIBRARY_STORAGE_KEY,
  addLyricLine,
  batchShiftLyricLines,
  convertSongLyricsChinese,
  createSongLyrics,
  exportToLrc,
  exportToSrt,
  exportToVtt,
  findLyrics,
  parseGenericLyrics,
  parseGroqTranscription,
  parseLrc,
  parsePlainText,
  parseSrt,
  parseVtt,
  removeLyricLine,
  removeLyrics,
  resetLyricLinesToOriginal,
  updateLyricLine,
  updateLyricsPresentation,
  upsertLyrics,
  type GroqTranscription,
  type LyricsLayoutMode,
  type LyricsLibrary,
  type LyricsSource,
  type TimedLyricLine,
} from '../shared/lyrics';
import type { MediaState } from '../shared/protocol';
import { isExtensionRuntime } from './client';
import { readStoredValue, writeStoredValue } from './storage';
import {
  isLyricsSyncChange,
  readSyncedLyricsLibrary,
  writeSyncedLyricsLibrary,
} from './sync-storage';

export interface LyricsSyncState {
  enabled: boolean;
  phase: 'idle' | 'syncing' | 'error';
  lastSyncedAt: number | null;
  bytesInUse: number | null;
  error: string | null;
}

const INITIAL_LYRICS_SYNC: LyricsSyncState = {
  enabled: false,
  phase: 'idle',
  lastSyncedAt: null,
  bytesInUse: null,
  error: null,
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeLyricsLibrary(stored: Partial<LyricsLibrary>): LyricsLibrary {
  if (stored.schemaVersion !== 1 || !Array.isArray(stored.entries)) {
    return EMPTY_LYRICS_LIBRARY;
  }
  return {
    schemaVersion: 1,
    updatedAt: stored.updatedAt ?? 0,
    entries: stored.entries
      .filter((entry) => Boolean(entry?.trackUrl && entry.lines?.length))
      .map((entry) => ({
        ...entry,
        fontScale: clamp(Number(entry.fontScale ?? 1), 0.8, 1.4),
        panelOpacity: Math.round(clamp(Number(entry.panelOpacity ?? 0.55), 0.2, 0.9) * 20) / 20,
        verticalOffset: clamp(Number(entry.verticalOffset ?? 0), -6, 24),
        leadTimeSeconds: Math.round(clamp(Number(entry.leadTimeSeconds ?? 1.5), 0.5, 3.0) * 10) / 10,
        layoutMode: (entry.layoutMode === 'video-overlay' ? 'video-overlay' : 'dock-bottom') as LyricsLayoutMode,
        dockHeightPercent: Math.round(clamp(Number(entry.dockHeightPercent ?? 30), 18, 50)),
      })),
  };
}

export function useLyricsLibrary(media: MediaState, syncEnabled = false) {
  const [library, setLibrary] = useState<LyricsLibrary>(EMPTY_LYRICS_LIBRARY);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<LyricsSyncState>(INITIAL_LYRICS_SYNC);
  const libraryRef = useRef(library);
  const syncEnabledRef = useRef(syncEnabled);

  useEffect(() => {
    let cancelled = false;
    void readStoredValue<Partial<LyricsLibrary>>(
      LYRICS_LIBRARY_STORAGE_KEY,
      EMPTY_LYRICS_LIBRARY,
    ).then((stored) => {
      if (cancelled) {
        return;
      }
      const resolved = normalizeLyricsLibrary(stored);
      libraryRef.current = resolved;
      setLibrary(resolved);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  const commit = useCallback((next: LyricsLibrary, upload = true) => {
    libraryRef.current = next;
    setLibrary(next);
    void writeStoredValue(LYRICS_LIBRARY_STORAGE_KEY, next);

    if (upload && syncEnabledRef.current) {
      setSync((current) => ({ ...current, phase: 'syncing', error: null }));
      void writeSyncedLyricsLibrary(next)
        .then((bytesInUse) => {
          setSync((current) => ({
            ...current,
            phase: 'idle',
            lastSyncedAt: Date.now(),
            bytesInUse,
            error: null,
          }));
        })
        .catch((error: unknown) => {
          setSync((current) => ({
            ...current,
            phase: 'error',
            error: error instanceof Error ? error.message : '歌詞同步失敗',
          }));
        });
    }
  }, []);

  useEffect(() => {
    syncEnabledRef.current = syncEnabled;
    setSync((current) => ({
      ...current,
      enabled: syncEnabled,
      phase: syncEnabled ? current.phase : 'idle',
      error: null,
    }));
    if (!loaded || !syncEnabled) {
      return undefined;
    }

    let cancelled = false;
    setSync((current) => ({ ...current, phase: 'syncing' }));
    void readSyncedLyricsLibrary()
      .then(async (remote) => {
        if (cancelled) return;
        const normalizedRemote = remote ? normalizeLyricsLibrary(remote) : null;
        if (normalizedRemote && normalizedRemote.updatedAt > libraryRef.current.updatedAt) {
          commit(normalizedRemote, false);
          return null;
        }
        return writeSyncedLyricsLibrary(libraryRef.current);
      })
      .then((bytesInUse) => {
        if (cancelled) return;
        setSync((current) => ({
          ...current,
          phase: 'idle',
          lastSyncedAt: Date.now(),
          bytesInUse: bytesInUse ?? current.bytesInUse,
          error: null,
        }));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSync((current) => ({
          ...current,
          phase: 'error',
          error: error instanceof Error ? error.message : '歌詞同步失敗',
        }));
      });
    return () => { cancelled = true; };
  }, [commit, loaded, syncEnabled]);

  useEffect(() => {
    if (!isExtensionRuntime()) return undefined;
    let refreshTimer: number | null = null;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'sync' || !syncEnabledRef.current || !isLyricsSyncChange(changes)) {
        return;
      }
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        void readSyncedLyricsLibrary()
          .then((remote) => {
            if (remote && remote.updatedAt > libraryRef.current.updatedAt) {
              commit(normalizeLyricsLibrary(remote), false);
              setSync((current) => ({
                ...current,
                phase: 'idle',
                lastSyncedAt: Date.now(),
                error: null,
              }));
            }
          })
          .catch(() => undefined);
      }, 150);
    };
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) {
        chrome.storage.onChanged.addListener(handleStorageChange);
      }
    } catch {}
    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      try {
        if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) {
          chrome.storage.onChanged.removeListener(handleStorageChange);
        }
      } catch {}
    };
  }, [commit]);

  const current = useMemo(
    () => (media.url ? findLyrics(library, media.url) : null),
    [library, media.url],
  );

  const saveParsed = useCallback((options: {
    source: LyricsSource;
    sourceLabel: string;
    lines: TimedLyricLine[];
  }) => {
    if (!media.available || !media.url) {
      throw new Error('請先開啟要套用歌詞的歌曲');
    }
    const previous = findLyrics(libraryRef.current, media.url) ?? undefined;
    const entry = createSongLyrics({
      id: crypto.randomUUID(),
      trackUrl: media.url,
      title: media.title,
      artist: media.artist,
      source: options.source,
      sourceLabel: options.sourceLabel,
      lines: options.lines,
      now: Date.now(),
      previous,
    });
    commit(upsertLyrics(libraryRef.current, entry));
    return entry;
  }, [commit, media.artist, media.available, media.title, media.url]);

  return {
    library,
    current,
    loaded,
    sync,
    importLrc: (text: string, sourceLabel: string) => {
      const parsed = parseLrc(text);
      return saveParsed({ ...parsed, sourceLabel });
    },
    importSrt: (text: string, sourceLabel: string) => {
      const parsed = parseSrt(text, media.duration);
      return saveParsed({ ...parsed, sourceLabel });
    },
    importVtt: (text: string, sourceLabel: string) => {
      const parsed = parseVtt(text, media.duration);
      return saveParsed({ ...parsed, sourceLabel });
    },
    importPlainText: (text: string, sourceLabel: string) => {
      const parsed = parsePlainText(text, media.duration || 180);
      return saveParsed({ ...parsed, sourceLabel });
    },
    importGeneric: (text: string, sourceLabel: string) => {
      const parsed = parseGenericLyrics(text, media.duration);
      return saveParsed({ ...parsed, sourceLabel });
    },
    importGroq: (transcription: GroqTranscription, sourceLabel: string) =>
      saveParsed({
        source: 'ai',
        sourceLabel,
        lines: parseGroqTranscription(transcription, media.duration),
      }),
    updateLine: (lineId: string, patch: Partial<TimedLyricLine>) => {
      if (!current || !media.url) return;
      const updated = updateLyricLine(current, lineId, patch);
      commit(upsertLyrics(libraryRef.current, updated));
    },
    batchShiftLines: (fromLineId: string | null, deltaSeconds: number) => {
      if (!current || !media.url) return;
      const updated = batchShiftLyricLines(current, fromLineId, deltaSeconds);
      commit(upsertLyrics(libraryRef.current, updated));
    },
    addLine: (afterLineId: string | null, text: string, start: number, end?: number) => {
      if (!current || !media.url) return;
      const updated = addLyricLine(current, afterLineId, text, start, end);
      commit(upsertLyrics(libraryRef.current, updated));
    },
    removeLine: (lineId: string) => {
      if (!current || !media.url) return;
      const updated = removeLyricLine(current, lineId);
      commit(upsertLyrics(libraryRef.current, updated));
    },
    resetToOriginal: () => {
      if (!current || !media.url) return;
      const updated = resetLyricLinesToOriginal(current);
      commit(upsertLyrics(libraryRef.current, updated));
    },
    convertChinese: (target: 'traditional' | 'simplified') => {
      if (!current || !media.url) return;
      const updated = convertSongLyricsChinese(current, target);
      commit(upsertLyrics(libraryRef.current, updated));
    },
    exportLyrics: (format: 'lrc' | 'srt' | 'vtt'): string => {
      if (!current) return '';
      if (format === 'srt') return exportToSrt(current);
      if (format === 'vtt') return exportToVtt(current);
      return exportToLrc(current);
    },
    setVisible: (visible: boolean) => {
      if (!media.url) return;
      commit(updateLyricsPresentation(libraryRef.current, media.url, { visible }));
    },
    setOffsetMs: (offsetMs: number) => {
      if (!media.url) return;
      const normalized = Math.round(Math.min(10_000, Math.max(-10_000, offsetMs)));
      commit(updateLyricsPresentation(libraryRef.current, media.url, { offsetMs: normalized }));
    },
    setFontScale: (fontScale: number) => {
      if (!media.url) return;
      commit(updateLyricsPresentation(libraryRef.current, media.url, {
        fontScale: Math.round(clamp(fontScale, 0.8, 1.4) * 20) / 20,
      }));
    },
    setPanelOpacity: (panelOpacity: number) => {
      if (!media.url) return;
      commit(updateLyricsPresentation(libraryRef.current, media.url, {
        panelOpacity: Math.round(clamp(panelOpacity, 0.2, 0.9) * 100) / 100,
      }));
    },
    setVerticalOffset: (verticalOffset: number) => {
      if (!media.url) return;
      commit(updateLyricsPresentation(libraryRef.current, media.url, {
        verticalOffset: Math.round(clamp(verticalOffset, -6, 24)),
      }));
    },
    setLeadTimeSeconds: (leadTimeSeconds: number) => {
      if (!media.url) return;
      commit(updateLyricsPresentation(libraryRef.current, media.url, {
        leadTimeSeconds: Math.round(clamp(leadTimeSeconds, 0.5, 3.0) * 10) / 10,
      }));
    },
    setLayoutMode: (layoutMode: LyricsLayoutMode) => {
      if (!media.url) return;
      commit(updateLyricsPresentation(libraryRef.current, media.url, { layoutMode }));
    },
    setDockHeightPercent: (dockHeightPercent: number) => {
      if (!media.url) return;
      commit(updateLyricsPresentation(libraryRef.current, media.url, {
        dockHeightPercent: Math.round(clamp(dockHeightPercent, 18, 50)),
      }));
    },
    removeCurrent: () => {
      if (!media.url) return;
      commit(removeLyrics(libraryRef.current, media.url));
    },
  };
}

