import type { PlaylistLibrary } from './library';
import type { LyricsLibrary } from './lyrics';

export const DRIVE_SYNC_SCHEMA_VERSION = 1;

export interface DriveSyncPayload {
  playlists: PlaylistLibrary;
  lyrics: LyricsLibrary;
}

export interface DriveSyncDocument {
  schemaVersion: typeof DRIVE_SYNC_SCHEMA_VERSION;
  updatedAt: number;
  checksum: string;
  payload: DriveSyncPayload;
}

export type DriveSyncDirection = 'upload' | 'download' | 'none';

export interface DriveSyncMergeResult {
  payload: DriveSyncPayload;
  applyRemotePlaylistsLocally: boolean;
  applyRemoteLyricsLocally: boolean;
  uploadMergedSnapshot: boolean;
}

export function createDriveSyncDocument(
  playlists: PlaylistLibrary,
  lyrics: LyricsLibrary,
  updatedAt = Math.max(playlists.updatedAt, lyrics.updatedAt),
): DriveSyncDocument {
  const payload = { playlists, lyrics };
  return {
    schemaVersion: DRIVE_SYNC_SCHEMA_VERSION,
    updatedAt,
    checksum: checksum(JSON.stringify(payload)),
    payload,
  };
}

export function parseDriveSyncDocument(value: string): DriveSyncDocument | null {
  try {
    const parsed = JSON.parse(value) as Partial<DriveSyncDocument>;
    if (
      parsed.schemaVersion !== DRIVE_SYNC_SCHEMA_VERSION ||
      typeof parsed.updatedAt !== 'number' ||
      !Number.isFinite(parsed.updatedAt) ||
      typeof parsed.checksum !== 'string' ||
      !isDriveSyncPayload(parsed.payload)
    ) {
      return null;
    }

    if (checksum(JSON.stringify(parsed.payload)) !== parsed.checksum) {
      return null;
    }
    return parsed as DriveSyncDocument;
  } catch {
    return null;
  }
}

export function chooseDriveSyncDirection(
  localUpdatedAt: number,
  remoteUpdatedAt: number | null,
): DriveSyncDirection {
  if (remoteUpdatedAt === null || localUpdatedAt > remoteUpdatedAt) {
    return 'upload';
  }
  if (remoteUpdatedAt > localUpdatedAt) {
    return 'download';
  }
  return 'none';
}

export function mergeDriveSyncPayload(
  local: DriveSyncPayload,
  remote: DriveSyncPayload | null,
): DriveSyncMergeResult {
  if (!remote) {
    return {
      payload: local,
      applyRemotePlaylistsLocally: false,
      applyRemoteLyricsLocally: false,
      uploadMergedSnapshot: true,
    };
  }

  const remotePlaylistsAreNewer = remote.playlists.updatedAt > local.playlists.updatedAt;
  const remoteLyricsAreNewer = remote.lyrics.updatedAt > local.lyrics.updatedAt;
  const localPlaylistsAreNewer = local.playlists.updatedAt > remote.playlists.updatedAt;
  const localLyricsAreNewer = local.lyrics.updatedAt > remote.lyrics.updatedAt;

  return {
    payload: {
      playlists: remotePlaylistsAreNewer ? remote.playlists : local.playlists,
      lyrics: remoteLyricsAreNewer ? remote.lyrics : local.lyrics,
    },
    applyRemotePlaylistsLocally: remotePlaylistsAreNewer,
    applyRemoteLyricsLocally: remoteLyricsAreNewer,
    uploadMergedSnapshot: localPlaylistsAreNewer || localLyricsAreNewer,
  };
}

function isDriveSyncPayload(value: unknown): value is DriveSyncPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<DriveSyncPayload>;
  return isPlaylistLibrary(payload.playlists) && isLyricsLibrary(payload.lyrics);
}

function isPlaylistLibrary(value: unknown): value is PlaylistLibrary {
  if (!value || typeof value !== 'object') return false;
  const library = value as Partial<PlaylistLibrary>;
  return (
    library.schemaVersion === 1 &&
    typeof library.updatedAt === 'number' &&
    Number.isFinite(library.updatedAt) &&
    Array.isArray(library.playlists)
  );
}

function isLyricsLibrary(value: unknown): value is LyricsLibrary {
  if (!value || typeof value !== 'object') return false;
  const library = value as Partial<LyricsLibrary>;
  return (
    library.schemaVersion === 1 &&
    typeof library.updatedAt === 'number' &&
    Number.isFinite(library.updatedAt) &&
    Array.isArray(library.entries)
  );
}

// FNV-1a detects truncated/corrupted snapshots. It is an integrity marker, not encryption.
function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
