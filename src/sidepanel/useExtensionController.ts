import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp, MAX_SEMITONES, MIN_SEMITONES } from '../shared/audio';
import type { GroqTranscription } from '../shared/lyrics';
import type { BpmAnalysisResult, ExtensionState, LyricsOverlayPayload, MediaCommand, PlaybackMode, PlaybackTrack } from '../shared/protocol';
import { getInitialState, sendBackgroundRequest } from './client';

export interface ExtensionController {
  state: ExtensionState;
  busy: boolean;
  detecting: boolean;
  error: string | null;
  startAudio: () => Promise<void>;
  stopAudio: () => Promise<void>;
  analyzeBpm: (sampleSeconds?: number) => Promise<BpmAnalysisResult>;
  setPitch: (semitones: number, cents?: number) => Promise<void>;
  setAudioQuality: (formantStrength: number) => Promise<void>;
  setVocalReduction: (strength: number) => Promise<void>;
  setVocalMix: (musicVolume: number, vocalVolume: number) => Promise<void>;
  setEqualizer: (low: number, mid: number, high: number) => Promise<void>;
  setVarispeed: (enabled: boolean) => Promise<void>;
  transcribeCurrentTab: (options: {
    apiKey: string;
    songContext: string;
    durationSeconds: number;
  }) => Promise<GroqTranscription>;
  cancelTabTranscription: () => Promise<void>;
  runMediaCommand: (command: MediaCommand) => Promise<void>;
  setLyricsOverlay: (lyrics: LyricsOverlayPayload | null) => Promise<void>;
  playPlaylistTrack: (playlistId: string, trackId: string, mode: PlaybackMode) => Promise<void>;
  playRecentTrack: (track: PlaybackTrack) => Promise<void>;
  setPlaybackMode: (mode: PlaybackMode) => Promise<void>;
  skipPlaylistTrack: (direction: 'previous' | 'next') => Promise<void>;
  openMediaTab: () => Promise<void>;
  retryDetection: () => Promise<void>;
  clearError: () => void;
}

export function useExtensionController(): ExtensionController {
  const [state, setState] = useState<ExtensionState>(getInitialState);
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const startPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refresh = useCallback(async (showDetection = false) => {
    if (showDetection) {
      setDetecting(true);
    }

    try {
      const response = await sendBackgroundRequest<ExtensionState>({
        target: 'background',
        type: 'GET_EXTENSION_STATE',
      });
      if (response.ok && response.data) {
        stateRef.current = response.data;
        setState(response.data);
      } else if (showDetection) {
        setError(response.error ?? '擴充功能沒有回應');
      }
    } catch (caught) {
      if (showDetection) {
        setError(caught instanceof Error ? caught.message : '無法偵測目前頁面');
      }
    } finally {
      setDetecting(false);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
    const intervalId = window.setInterval(() => void refresh(), 500);
    return () => window.clearInterval(intervalId);
  }, [refresh]);

  const withBusy = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await action();
        await refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : '操作失敗');
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const ensureAudioStarted = useCallback(async () => {
    if (stateRef.current.audio.status === 'active' || stateRef.current.audio.status === 'starting') {
      return;
    }

    if (!stateRef.current.media.available) {
      throw new Error('尚未找到可播放的歌曲');
    }

    if (!startPromiseRef.current) {
      startPromiseRef.current = (async () => {
        const response = await sendBackgroundRequest({ target: 'background', type: 'START_AUDIO' });
        if (!response.ok) {
          throw new Error(response.error ?? '無法開始音訊處理');
        }
        await refresh();
      })();
    }

    try {
      await startPromiseRef.current;
    } finally {
      startPromiseRef.current = null;
    }
  }, [refresh]);

  const startAudio = useCallback(() => withBusy(ensureAudioStarted), [ensureAudioStarted, withBusy]);

  const stopAudio = useCallback(
    () =>
      withBusy(async () => {
        const response = await sendBackgroundRequest({ target: 'background', type: 'STOP_AUDIO' });
        if (!response.ok) {
          throw new Error(response.error ?? '無法停止音訊處理');
        }
      }),
    [withBusy],
  );

  const analyzeBpm = useCallback(async (sampleSeconds = 8): Promise<BpmAnalysisResult> => {
    const response = await sendBackgroundRequest<BpmAnalysisResult>({
      target: 'background',
      type: 'ANALYZE_BPM',
      sampleSeconds,
    });
    if (!response.ok || !response.data) {
      throw new Error(response.error ?? '無法分析目前歌曲的 BPM');
    }
    return response.data;
  }, []);

  const setPitch = useCallback(
    async (semitones: number, cents = state.audio.pitchCents) => {
      const normalizedSemitones = Math.round(clamp(semitones, MIN_SEMITONES, MAX_SEMITONES));
      const normalizedCents = Math.round(clamp(cents, -100, 100));
      setState((current) => ({
        ...current,
        audio: {
          ...current.audio,
          pitchSemitones: normalizedSemitones,
          pitchCents: normalizedCents,
        },
      }));

      const response = await sendBackgroundRequest({
        target: 'background',
        type: 'SET_PITCH',
        semitones: normalizedSemitones,
        cents: normalizedCents,
      });
      if (!response.ok) {
        setError(response.error ?? '無法調整 Key');
        return;
      }

      if (stateRef.current.audio.status === 'idle' || stateRef.current.audio.status === 'error') {
        setBusy(true);
        setError(null);
        try {
          await ensureAudioStarted();
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : '無法開始音訊處理');
        } finally {
          setBusy(false);
        }
      }
    },
    [ensureAudioStarted, state.audio.pitchCents],
  );

  const runMediaCommand = useCallback(
    async (command: MediaCommand) => {
      const response = await sendBackgroundRequest({
        target: 'background',
        type: 'MEDIA_COMMAND',
        command,
      });
      if (!response.ok) {
        setError(response.error ?? '無法控制目前媒體');
      } else {
        await refresh();
      }
    },
    [refresh],
  );

  const setAudioQuality = useCallback(
    async (formantStrength: number) => {
      const normalized = clamp(formantStrength, 0, 1);
      setState((current) => ({
        ...current,
        audio: { ...current.audio, formantStrength: normalized },
      }));
      const response = await sendBackgroundRequest({
        target: 'background',
        type: 'SET_AUDIO_QUALITY',
        formantStrength: normalized,
      });
      if (!response.ok) {
        setError(response.error ?? '無法切換移調品質');
      }
    },
    [],
  );

  const setVocalReduction = useCallback(
    async (strength: number) => {
      const normalized = Math.max(0, Math.min(1, strength));
      setState((current) => ({
        ...current,
        audio: { ...current.audio, vocalReduction: normalized },
      }));
      const response = await sendBackgroundRequest({
        target: 'background',
        type: 'SET_VOCAL_REDUCTION',
        strength: normalized,
      });
      if (!response.ok) {
        setError(response.error ?? '無法設定人聲消除強度');
      }
    },
    [],
  );

  const setVocalMix = useCallback(
    async (musicVolume: number, vocalVolume: number) => {
      const normalizedMusic = Math.max(0, Math.min(2, musicVolume));
      const normalizedVocal = Math.max(0, Math.min(2, vocalVolume));
      setState((current) => ({
        ...current,
        audio: { ...current.audio, vocalMix: { musicVolume: normalizedMusic, vocalVolume: normalizedVocal } },
      }));
      const response = await sendBackgroundRequest({
        target: 'background',
        type: 'SET_VOCAL_MIX',
        musicVolume: normalizedMusic,
        vocalVolume: normalizedVocal,
      });
      if (!response.ok) {
        setError(response.error ?? '無法設定人聲混音');
      }
    },
    [],
  );

  const setEqualizer = useCallback(
    async (low: number, mid: number, high: number) => {
      const normalized = {
        low: Math.max(-12, Math.min(12, low)),
        mid: Math.max(-12, Math.min(12, mid)),
        high: Math.max(-12, Math.min(12, high)),
      };
      setState((current) => ({
        ...current,
        audio: { ...current.audio, equalizer: normalized },
      }));
      const response = await sendBackgroundRequest({
        target: 'background',
        type: 'SET_EQUALIZER',
        ...normalized,
      });
      if (!response.ok) {
        setError(response.error ?? '無法設定等化器');
      }
    },
    [],
  );

  const setVarispeed = useCallback(
    async (enabled: boolean) => {
      setState((current) => ({
        ...current,
        audio: { ...current.audio, varispeed: enabled },
      }));
      const response = await sendBackgroundRequest({
        target: 'background',
        type: 'SET_VARISPEED',
        enabled,
      });
      if (!response.ok) {
        setError(response.error ?? '無法切換 Varispeed 模式');
      }
    },
    [],
  );

  const transcribeCurrentTab = useCallback(async (options: {
    apiKey: string;
    songContext: string;
    durationSeconds: number;
  }) => {
    const response = await sendBackgroundRequest<GroqTranscription>({
      target: 'background',
      type: 'TRANSCRIBE_TAB_AUDIO',
      ...options,
    });
    if (!response.ok || !response.data) {
      throw new Error(response.error ?? '無法從目前分頁產生 AI 歌詞');
    }
    return response.data;
  }, []);

  const cancelTabTranscription = useCallback(async () => {
    const response = await sendBackgroundRequest({
      target: 'background',
      type: 'CANCEL_TAB_TRANSCRIPTION',
    });
    if (!response.ok) {
      throw new Error(response.error ?? '無法取消目前的 AI 歌詞工作');
    }
  }, []);

  const setLyricsOverlay = useCallback(async (lyrics: LyricsOverlayPayload | null) => {
    const response = await sendBackgroundRequest({
      target: 'background',
      type: 'MEDIA_COMMAND',
      command: { kind: 'SET_LYRICS_OVERLAY', lyrics },
    });
    if (!response.ok) {
      setError(response.error ?? '無法更新歌詞覆蓋層');
    }
  }, []);

  const playPlaylistTrack = useCallback(
    (playlistId: string, trackId: string, mode: PlaybackMode) =>
      withBusy(async () => {
        const response = await sendBackgroundRequest({
          target: 'background',
          type: 'PLAY_PLAYLIST_TRACK',
          playlistId,
          trackId,
          mode,
        });
        if (!response.ok) {
          throw new Error(response.error ?? '無法播放歌單歌曲');
        }
      }),
    [withBusy],
  );

  const playRecentTrack = useCallback(
    (track: PlaybackTrack) =>
      withBusy(async () => {
        const response = await sendBackgroundRequest({
          target: 'background',
          type: 'PLAY_RECENT_TRACK',
          track,
        });
        if (!response.ok) {
          throw new Error(response.error ?? '無法播放最近歌曲');
        }
      }),
    [withBusy],
  );

  const setPlaybackMode = useCallback(async (mode: PlaybackMode) => {
    const response = await sendBackgroundRequest({
      target: 'background',
      type: 'SET_PLAYBACK_MODE',
      mode,
    });
    if (!response.ok) {
      setError(response.error ?? '無法切換播放模式');
      return;
    }
    await refresh();
  }, [refresh]);

  const skipPlaylistTrack = useCallback(
    (direction: 'previous' | 'next') =>
      withBusy(async () => {
        const response = await sendBackgroundRequest({
          target: 'background',
          type: 'SKIP_PLAYLIST_TRACK',
          direction,
        });
        if (!response.ok) {
          throw new Error(response.error ?? '無法切換歌單歌曲');
        }
      }),
    [withBusy],
  );

  const openMediaTab = useCallback(async () => {
    const response = await sendBackgroundRequest({ target: 'background', type: 'OPEN_MEDIA_TAB' });
    if (!response.ok) {
      setError(response.error ?? '無法開啟媒體分頁');
    }
  }, []);

  const retryDetection = useCallback(async () => {
    setError(null);
    await refresh(true);
  }, [refresh]);

  return {
    state,
    busy,
    detecting,
    error,
    startAudio,
    stopAudio,
    analyzeBpm,
    setPitch,
    setAudioQuality,
    setVocalReduction,
    setVocalMix,
    setEqualizer,
    setVarispeed,
    transcribeCurrentTab,
    cancelTabTranscription,
    runMediaCommand,
    setLyricsOverlay,
    playPlaylistTrack,
    playRecentTrack,
    setPlaybackMode,
    skipPlaylistTrack,
    openMediaTab,
    retryDetection,
    clearError: () => setError(null),
  };
}
