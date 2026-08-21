import type { PlaylistLibrary } from '../shared/library';
import type { LyricsLibrary } from '../shared/lyrics';
import {
  PLAYLIST_SYNC_META_KEY,
  chunkKeys,
  decodePlaylistLibrary,
  encodePlaylistLibrary,
  type PlaylistSyncMeta,
} from '../shared/sync-library';
import {
  LYRICS_SYNC_CHUNK_PREFIX,
  LYRICS_SYNC_META_KEY,
  decodeLyricsLibrary,
  encodeLyricsLibrary,
  lyricChunkKeys,
  type LyricsSyncMeta,
} from '../shared/sync-lyrics';
import { isExtensionRuntime } from './client';

const PREVIEW_SYNC_KEY = 'playlistSyncPreviewV1';
const PREVIEW_LYRICS_SYNC_KEY = 'lyricsSyncPreviewV1';

export type GoogleAccountStatus = 'syncing' | 'signed-in' | 'signed-out' | 'unavailable';

export interface GoogleAccountInfo {
  status: GoogleAccountStatus;
  email: string | null;
}

export async function readSyncedLibrary(): Promise<PlaylistLibrary | null> {
  if (!isExtensionRuntime()) {
    const raw = localStorage.getItem(PREVIEW_SYNC_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as PlaylistLibrary;
    } catch {
      return null;
    }
  }

  try {
    if (typeof chrome === 'undefined' || !chrome?.storage?.sync) return null;
    const metaResult = await chrome.storage.sync.get(PLAYLIST_SYNC_META_KEY);
    const meta = metaResult?.[PLAYLIST_SYNC_META_KEY] as PlaylistSyncMeta | undefined;
    if (!meta || meta.schemaVersion !== 1 || meta.chunkCount < 1) {
      return null;
    }
    const values = await chrome.storage.sync.get([
      PLAYLIST_SYNC_META_KEY,
      ...chunkKeys(meta.chunkCount),
    ]);
    return decodePlaylistLibrary(values);
  } catch {
    return null;
  }
}

export async function writeSyncedLibrary(library: PlaylistLibrary): Promise<number> {
  if (!isExtensionRuntime()) {
    try {
      localStorage.setItem(PREVIEW_SYNC_KEY, JSON.stringify(library));
      return JSON.stringify(library).length;
    } catch {
      return 0;
    }
  }

  try {
    if (typeof chrome === 'undefined' || !chrome?.storage?.sync) return 0;
    const previous = await chrome.storage.sync.get(PLAYLIST_SYNC_META_KEY);
    const previousMeta = previous?.[PLAYLIST_SYNC_META_KEY] as PlaylistSyncMeta | undefined;
    const encoded = encodePlaylistLibrary(library);
    await chrome.storage.sync.set(encoded.values);

    if (previousMeta && previousMeta.chunkCount > encoded.meta.chunkCount) {
      await chrome.storage.sync.remove(
        chunkKeys(previousMeta.chunkCount).slice(encoded.meta.chunkCount),
      );
    }
    return await chrome.storage.sync.getBytesInUse(null);
  } catch {
    return 0;
  }
}

export async function readSyncedLyricsLibrary(): Promise<LyricsLibrary | null> {
  if (!isExtensionRuntime()) {
    const raw = localStorage.getItem(PREVIEW_LYRICS_SYNC_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LyricsLibrary;
    } catch {
      return null;
    }
  }

  try {
    if (typeof chrome === 'undefined' || !chrome?.storage?.sync) return null;
    const metaResult = await chrome.storage.sync.get(LYRICS_SYNC_META_KEY);
    const meta = metaResult?.[LYRICS_SYNC_META_KEY] as LyricsSyncMeta | undefined;
    if (!meta || meta.schemaVersion !== 1 || meta.chunkCount < 1) {
      return null;
    }
    const values = await chrome.storage.sync.get([
      LYRICS_SYNC_META_KEY,
      ...lyricChunkKeys(meta.chunkCount),
    ]);
    return decodeLyricsLibrary(values);
  } catch {
    return null;
  }
}

export async function writeSyncedLyricsLibrary(library: LyricsLibrary): Promise<number> {
  if (!isExtensionRuntime()) {
    try {
      localStorage.setItem(PREVIEW_LYRICS_SYNC_KEY, JSON.stringify(library));
      return JSON.stringify(library).length;
    } catch {
      return 0;
    }
  }

  try {
    if (typeof chrome === 'undefined' || !chrome?.storage?.sync) return 0;
    const previous = await chrome.storage.sync.get(LYRICS_SYNC_META_KEY);
    const previousMeta = previous?.[LYRICS_SYNC_META_KEY] as LyricsSyncMeta | undefined;
    const encoded = encodeLyricsLibrary(library);
    await chrome.storage.sync.set(encoded.values);
    if (previousMeta && previousMeta.chunkCount > encoded.meta.chunkCount) {
      await chrome.storage.sync.remove(
        lyricChunkKeys(previousMeta.chunkCount).slice(encoded.meta.chunkCount),
      );
    }
    return await chrome.storage.sync.getBytesInUse(null);
  } catch {
    return 0;
  }
}

export async function getGoogleAccountInfo(): Promise<GoogleAccountInfo> {
  if (!isExtensionRuntime()) {
    return { status: 'syncing', email: 'preview@gmail.com' };
  }

  try {
    const [syncAccount, anyAccount] = await Promise.all([
      chrome.identity.getProfileUserInfo({ accountStatus: 'SYNC' }),
      chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }),
    ]);
    if (syncAccount.email) {
      return { status: 'syncing', email: syncAccount.email };
    }
    if (anyAccount.email) {
      return { status: 'signed-in', email: anyAccount.email };
    }
    return { status: 'signed-out', email: null };
  } catch {
    return { status: 'unavailable', email: null };
  }
}

export function isPlaylistSyncChange(changes: Record<string, chrome.storage.StorageChange>): boolean {
  return Object.keys(changes).some(
    (key) => key === PLAYLIST_SYNC_META_KEY || key.startsWith('playlistSyncV1:chunk:'),
  );
}

export function isLyricsSyncChange(changes: Record<string, chrome.storage.StorageChange>): boolean {
  return Object.keys(changes).some(
    (key) => key === LYRICS_SYNC_META_KEY || key.startsWith(LYRICS_SYNC_CHUNK_PREFIX),
  );
}
