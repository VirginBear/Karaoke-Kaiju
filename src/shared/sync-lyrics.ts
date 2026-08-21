import type { LyricsLibrary } from './lyrics';

export const LYRICS_SYNC_META_KEY = 'lyricsSyncV1:meta';
export const LYRICS_SYNC_CHUNK_PREFIX = 'lyricsSyncV1:chunk:';
export const LYRICS_SYNC_CHUNK_LENGTH = 7000;

export interface LyricsSyncMeta {
  schemaVersion: 1;
  updatedAt: number;
  chunkCount: number;
  checksum: string;
  encodedBytes: number;
}

export interface EncodedLyricsSync {
  meta: LyricsSyncMeta;
  values: Record<string, unknown>;
}

export function encodeLyricsLibrary(library: LyricsLibrary): EncodedLyricsSync {
  const encoded = encodeUtf8(JSON.stringify(library));
  const chunks: string[] = [];
  for (let offset = 0; offset < encoded.length; offset += LYRICS_SYNC_CHUNK_LENGTH) {
    chunks.push(encoded.slice(offset, offset + LYRICS_SYNC_CHUNK_LENGTH));
  }
  const meta: LyricsSyncMeta = {
    schemaVersion: 1,
    updatedAt: library.updatedAt,
    chunkCount: chunks.length,
    checksum: checksum(encoded),
    encodedBytes: encoded.length,
  };
  const values: Record<string, unknown> = { [LYRICS_SYNC_META_KEY]: meta };
  chunks.forEach((chunk, index) => {
    values[`${LYRICS_SYNC_CHUNK_PREFIX}${index}`] = chunk;
  });
  return { meta, values };
}

export function decodeLyricsLibrary(values: Record<string, unknown>): LyricsLibrary | null {
  const meta = values[LYRICS_SYNC_META_KEY] as Partial<LyricsSyncMeta> | undefined;
  if (
    meta?.schemaVersion !== 1 ||
    typeof meta.chunkCount !== 'number' ||
    meta.chunkCount < 1 ||
    typeof meta.checksum !== 'string'
  ) {
    return null;
  }
  const encoded = Array.from({ length: meta.chunkCount }, (_, index) =>
    values[`${LYRICS_SYNC_CHUNK_PREFIX}${index}`],
  );
  if (encoded.some((chunk) => typeof chunk !== 'string')) {
    return null;
  }
  const joined = (encoded as string[]).join('');
  if (checksum(joined) !== meta.checksum) {
    return null;
  }
  try {
    const library = JSON.parse(decodeUtf8(joined)) as Partial<LyricsLibrary>;
    if (
      library.schemaVersion !== 1 ||
      typeof library.updatedAt !== 'number' ||
      !Array.isArray(library.entries)
    ) {
      return null;
    }
    return library as LyricsLibrary;
  } catch {
    return null;
  }
}

export function lyricChunkKeys(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${LYRICS_SYNC_CHUNK_PREFIX}${index}`);
}

function encodeUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function decodeUtf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
