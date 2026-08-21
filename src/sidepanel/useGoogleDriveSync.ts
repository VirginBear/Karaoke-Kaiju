import { useCallback, useEffect, useRef, useState } from 'react';
import { createDriveSyncDocument, mergeDriveSyncPayload } from '../shared/google-drive-sync';
import type { PlaylistLibrary } from '../shared/library';
import type { LyricsLibrary } from '../shared/lyrics';
import { getGoogleDriveToken, isGoogleDriveOAuthConfigured } from './google-drive-auth';
import { deleteDriveSyncFile, readDriveSyncFile, writeDriveSyncFile } from './google-drive-api';
import { readStoredValue, writeStoredValue } from './storage';

const DRIVE_SYNC_ENABLED_KEY = 'googleDriveAppDataSyncEnabledV1';

export interface GoogleDriveSyncState {
  configured: boolean;
  enabled: boolean;
  phase: 'idle' | 'authorizing' | 'syncing' | 'error';
  lastSyncedAt: number | null;
  backupDeleted: boolean;
  error: string | null;
}

interface GoogleDriveSyncOptions {
  loaded: boolean;
  playlists: PlaylistLibrary;
  lyrics: LyricsLibrary;
  replacePlaylists: (library: PlaylistLibrary) => void;
  replaceLyrics: (library: LyricsLibrary) => void;
}

export function useGoogleDriveSync({
  loaded,
  playlists,
  lyrics,
  replacePlaylists,
  replaceLyrics,
}: GoogleDriveSyncOptions) {
  const [state, setState] = useState<GoogleDriveSyncState>(() => ({
    configured: isGoogleDriveOAuthConfigured(),
    enabled: false,
    phase: 'idle',
    lastSyncedAt: null,
    backupDeleted: false,
    error: null,
  }));
  const latestRef = useRef({ playlists, lyrics });
  const replaceRef = useRef({ replacePlaylists, replaceLyrics });
  const initialReconciliationRef = useRef(false);
  latestRef.current = { playlists, lyrics };
  replaceRef.current = { replacePlaylists, replaceLyrics };

  const synchronize = useCallback(async (interactive: boolean): Promise<boolean> => {
    setState((current) => ({
      ...current,
      phase: interactive ? 'authorizing' : 'syncing',
      backupDeleted: false,
      error: null,
    }));
    try {
      const token = await getGoogleDriveToken(interactive);
      setState((current) => ({ ...current, phase: 'syncing' }));
      const remote = await readDriveSyncFile(token);
      const local = latestRef.current;
      const merged = mergeDriveSyncPayload(
        local,
        remote?.document.payload ?? null,
      );

      if (merged.applyRemotePlaylistsLocally) {
        replaceRef.current.replacePlaylists(merged.payload.playlists);
      }
      if (merged.applyRemoteLyricsLocally) {
        replaceRef.current.replaceLyrics(merged.payload.lyrics);
      }
      if (merged.uploadMergedSnapshot) {
        const document = createDriveSyncDocument(
          merged.payload.playlists,
          merged.payload.lyrics,
        );
        await writeDriveSyncFile(token, remote?.fileId ?? null, document);
      }

      initialReconciliationRef.current = true;
      setState((current) => ({
        ...current,
        phase: 'idle',
        lastSyncedAt: Date.now(),
        error: null,
      }));
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Google Drive 同步失敗',
      }));
      return false;
    }
  }, []);

  useEffect(() => {
    if (!loaded) return undefined;
    let cancelled = false;
    void readStoredValue<boolean>(DRIVE_SYNC_ENABLED_KEY, false).then(async (enabled) => {
      if (cancelled) return;
      setState((current) => ({ ...current, enabled }));
      if (enabled && isGoogleDriveOAuthConfigured()) {
        await synchronize(false);
      }
    });
    return () => { cancelled = true; };
  }, [loaded, synchronize]);

  useEffect(() => {
    if (!loaded || !state.enabled || !initialReconciliationRef.current) return undefined;
    const timer = window.setTimeout(() => {
      void synchronize(false);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [loaded, lyrics.updatedAt, playlists.updatedAt, state.enabled, synchronize]);

  const setEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (!enabled) {
      initialReconciliationRef.current = false;
      await writeStoredValue(DRIVE_SYNC_ENABLED_KEY, false);
      setState((current) => ({ ...current, enabled: false, phase: 'idle', error: null }));
      return true;
    }

    const synced = await synchronize(true);
    if (!synced) return false;
    await writeStoredValue(DRIVE_SYNC_ENABLED_KEY, true);
    setState((current) => ({ ...current, enabled: true }));
    return true;
  }, [synchronize]);

  const syncNow = useCallback(async (): Promise<boolean> => synchronize(true), [synchronize]);

  const deleteBackup = useCallback(async (): Promise<boolean> => {
    setState((current) => ({ ...current, phase: 'authorizing', backupDeleted: false, error: null }));
    try {
      const token = await getGoogleDriveToken(true);
      setState((current) => ({ ...current, phase: 'syncing' }));
      const remote = await readDriveSyncFile(token);
      if (remote) await deleteDriveSyncFile(token, remote.fileId);
      initialReconciliationRef.current = false;
      await writeStoredValue(DRIVE_SYNC_ENABLED_KEY, false);
      setState((current) => ({
        ...current,
        enabled: false,
        phase: 'idle',
        lastSyncedAt: null,
        backupDeleted: true,
        error: null,
      }));
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        phase: 'error',
        backupDeleted: false,
        error: error instanceof Error ? error.message : 'Google Drive 備份刪除失敗',
      }));
      return false;
    }
  }, []);

  return { state, setEnabled, syncNow, deleteBackup };
}
