import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EMPTY_PLAYLIST_LIBRARY,
  PLAYLIST_LIBRARY_STORAGE_KEY,
  addMediaToPlaylist,
  addTrackToPlaylist,
  createPlaylist,
  deletePlaylist,
  normalizeTrackUrl,
  removeTrack,
  renamePlaylist,
  type PlaylistLibrary,
  type PlaylistTrack,
} from '../shared/library';
import type { AudioSessionState, MediaState } from '../shared/protocol';
import { isExtensionRuntime } from './client';
import { readStoredValue, writeStoredValue } from './storage';
import {
  getGoogleAccountInfo,
  isPlaylistSyncChange,
  readSyncedLibrary,
  writeSyncedLibrary,
  type GoogleAccountInfo,
} from './sync-storage';

const PLAYLIST_SYNC_ENABLED_KEY = 'playlistGoogleSyncEnabled';

export interface PlaylistSyncState extends GoogleAccountInfo {
  enabled: boolean;
  phase: 'idle' | 'syncing' | 'error';
  lastSyncedAt: number | null;
  bytesInUse: number | null;
  error: string | null;
}

type LegacyPlaylistLibrary = Partial<PlaylistLibrary> & {
  version?: number;
  playlists?: PlaylistLibrary['playlists'];
};

function createId(): string {
  return crypto.randomUUID();
}

function normalizeLibrary(stored: LegacyPlaylistLibrary): PlaylistLibrary {
  const schemaVersion = stored.schemaVersion ?? stored.version;
  if (schemaVersion !== 1 || !Array.isArray(stored.playlists)) {
    return EMPTY_PLAYLIST_LIBRARY;
  }

  const playlists = stored.playlists.map((playlist) => ({
    ...playlist,
    tracks: playlist.tracks.map((track) => ({
      ...track,
      url: normalizeTrackUrl(track.url),
      practice: {
        ...track.practice,
        loopEnabled: track.practice.loopEnabled ?? false,
      },
    })),
  }));
  const latestPlaylistUpdate = playlists.reduce(
    (latest, playlist) => Math.max(latest, playlist.updatedAt),
    0,
  );
  return {
    schemaVersion: 1,
    updatedAt: stored.updatedAt ?? latestPlaylistUpdate,
    playlists,
  };
}

const INITIAL_SYNC_STATE: PlaylistSyncState = {
  enabled: false,
  status: 'unavailable',
  email: null,
  phase: 'idle',
  lastSyncedAt: null,
  bytesInUse: null,
  error: null,
};

export function usePlaylistLibrary() {
  const [library, setLibrary] = useState<PlaylistLibrary>(EMPTY_PLAYLIST_LIBRARY);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<PlaylistSyncState>(INITIAL_SYNC_STATE);
  const libraryRef = useRef(library);
  const syncEnabledRef = useRef(false);

  const commitLibrary = useCallback((next: PlaylistLibrary, upload = true) => {
    libraryRef.current = next;
    setLibrary(next);
    void writeStoredValue(PLAYLIST_LIBRARY_STORAGE_KEY, next);

    if (upload && syncEnabledRef.current) {
      setSync((current) => ({ ...current, phase: 'syncing', error: null }));
      void writeSyncedLibrary(next)
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
            error: error instanceof Error ? error.message : '歌單同步失敗',
          }));
        });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      readStoredValue<LegacyPlaylistLibrary>(
        PLAYLIST_LIBRARY_STORAGE_KEY,
        EMPTY_PLAYLIST_LIBRARY,
      ),
      readStoredValue<boolean>(PLAYLIST_SYNC_ENABLED_KEY, false),
      getGoogleAccountInfo(),
    ]).then(async ([stored, enabled, account]) => {
      if (cancelled) {
        return;
      }

      let resolved = normalizeLibrary(stored);
      syncEnabledRef.current = enabled;
      setSync({ ...INITIAL_SYNC_STATE, ...account, enabled });

      if (enabled && account.status === 'syncing') {
        const remote = await readSyncedLibrary().catch(() => null);
        if (cancelled) {
          return;
        }
        if (remote && remote.updatedAt > resolved.updatedAt) {
          resolved = normalizeLibrary(remote);
          void writeStoredValue(PLAYLIST_LIBRARY_STORAGE_KEY, resolved);
        } else if (resolved.updatedAt > 0) {
          void writeSyncedLibrary(resolved).catch(() => undefined);
        }
      }

      libraryRef.current = resolved;
      setLibrary(resolved);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isExtensionRuntime()) {
      return undefined;
    }

    let refreshTimer: number | null = null;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'sync' || !syncEnabledRef.current || !isPlaylistSyncChange(changes)) {
        return;
      }
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
      refreshTimer = window.setTimeout(() => {
        void readSyncedLibrary()
          .then((remote) => {
            if (remote && remote.updatedAt > libraryRef.current.updatedAt) {
              commitLibrary(normalizeLibrary(remote), false);
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
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
      try {
        if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) {
          chrome.storage.onChanged.removeListener(handleStorageChange);
        }
      } catch {}
    };
  }, [commitLibrary]);

  const update = useCallback(
    (updater: (current: PlaylistLibrary) => PlaylistLibrary) => {
      commitLibrary(updater(libraryRef.current));
    },
    [commitLibrary],
  );

  const addPlaylist = useCallback(
    (name: string) => {
      const id = createId();
      update((current) => createPlaylist(current, name, id, Date.now()));
      return id;
    },
    [update],
  );

  const addCurrentMedia = useCallback(
    (playlistId: string, media: MediaState, audio: AudioSessionState) => {
      update((current) =>
        addMediaToPlaylist(current, playlistId, media, audio, createId(), Date.now()),
      );
    },
    [update],
  );

  const addSavedTrack = useCallback(
    (playlistId: string, track: PlaylistTrack) => {
      update((current) => addTrackToPlaylist(current, playlistId, track, Date.now()));
    },
    [update],
  );

  const importSharedPlaylist = useCallback(
    (name: string, tracks: PlaylistTrack[]) => {
      const id = createId();
      update((current) => {
        const withNew = createPlaylist(current, name, id, Date.now());
        return {
          ...withNew,
          playlists: withNew.playlists.map((p) => (p.id === id ? { ...p, tracks } : p)),
          updatedAt: Date.now(),
        };
      });
      return id;
    },
    [update],
  );

  const setSyncEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      const account = await getGoogleAccountInfo();
      setSync((current) => ({ ...current, ...account, error: null }));
      if (enabled && account.status !== 'syncing') {
        setSync((current) => ({
          ...current,
          enabled: false,
          phase: 'error',
          error:
            account.status === 'signed-in'
              ? '這個 Google 帳號尚未開啟 Chrome 同步'
              : '請先在 Chrome 登入 Google 帳號並開啟同步',
        }));
        return false;
      }

      syncEnabledRef.current = enabled;
      await writeStoredValue(PLAYLIST_SYNC_ENABLED_KEY, enabled);
      setSync((current) => ({ ...current, enabled, phase: 'syncing', error: null }));
      if (!enabled) {
        setSync((current) => ({ ...current, phase: 'idle' }));
        return true;
      }

      try {
        const remote = await readSyncedLibrary();
        const local = libraryRef.current;
        if (remote && remote.updatedAt > local.updatedAt) {
          commitLibrary(normalizeLibrary(remote), false);
        } else {
          const bytesInUse = await writeSyncedLibrary(local);
          setSync((current) => ({ ...current, bytesInUse }));
        }
        setSync((current) => ({
          ...current,
          enabled: true,
          phase: 'idle',
          lastSyncedAt: Date.now(),
          error: null,
        }));
        return true;
      } catch (error) {
        setSync((current) => ({
          ...current,
          phase: 'error',
          error: error instanceof Error ? error.message : '歌單同步失敗',
        }));
        return false;
      }
    },
    [commitLibrary],
  );

  const refreshAccount = useCallback(async () => {
    const account = await getGoogleAccountInfo();
    setSync((current) => ({ ...current, ...account }));
  }, []);

  return {
    library,
    loaded,
    sync,
    setSyncEnabled,
    refreshAccount,
    addPlaylist,
    renamePlaylist: (playlistId: string, name: string) =>
      update((current) => renamePlaylist(current, playlistId, name, Date.now())),
    deletePlaylist: (playlistId: string) =>
      update((current) => deletePlaylist(current, playlistId, Date.now())),
    addCurrentMedia,
    addSavedTrack,
    importSharedPlaylist,
    removeTrack: (playlistId: string, trackId: string) =>
      update((current) => removeTrack(current, playlistId, trackId, Date.now())),
  };
}
