import {
  EMPTY_AUDIO_SESSION,
  EMPTY_MEDIA_STATE,
  EMPTY_PLAYBACK_QUEUE,
  type ExtensionResponse,
  type ExtensionState,
  type MediaCommand,
  type SidePanelRequest,
} from '../shared/protocol';

const previewMedia = {
  ...EMPTY_MEDIA_STATE,
  available: true,
  title: '如果可以',
  artist: '韋禮安',
  platform: 'YouTube',
  url: 'https://www.youtube.com/watch?v=8MG--WuNW1Y',
  duration: 210,
  currentTime: 82,
  paused: false,
  playbackRate: 0.9,
  loop: {
    start: 70.2,
    end: 88.7,
    enabled: true,
  },
};

let previewState: ExtensionState = {
  audio: {
    ...EMPTY_AUDIO_SESSION,
    pitchSemitones: -2,
  },
  media: previewMedia,
  mediaError: null,
  queue: EMPTY_PLAYBACK_QUEUE,
};

if (!isExtensionRuntime()) {
  const previewMode = new URLSearchParams(window.location.search).get('preview');
  if (previewMode === 'media-error') {
    previewState = {
      audio: EMPTY_AUDIO_SESSION,
      media: EMPTY_MEDIA_STATE,
      mediaError: '無法取得這個分頁的權限。請重新載入擴充功能與 YouTube 分頁。',
      queue: EMPTY_PLAYBACK_QUEUE,
    };
  } else if (previewMode === 'capture-invocation') {
    previewState = {
      audio: {
        ...EMPTY_AUDIO_SESSION,
        status: 'error',
        error: '請在要練唱的 YouTube 分頁，點一次 Chrome 工具列或「擴充功能」拼圖選單中的「Karaoke Kaiju」圖示來啟動音訊。',
      },
      media: previewMedia,
      mediaError: null,
      queue: EMPTY_PLAYBACK_QUEUE,
    };
  } else if (previewMode === 'lyrics') {
    previewState = {
      audio: EMPTY_AUDIO_SESSION,
      media: {
        ...previewMedia,
        title: '花香',
        artist: '許紹洋',
        url: 'https://www.youtube.com/watch?v=-ZRrhoFBM4s',
        duration: 240,
        currentTime: 14,
        playbackRate: 1,
        loop: { start: null, end: null, enabled: false },
      },
      mediaError: null,
      queue: EMPTY_PLAYBACK_QUEUE,
    };
  } else if (previewMode === 'bpm') {
    previewState = {
      audio: {
        ...EMPTY_AUDIO_SESSION,
        status: 'active',
        pitchSemitones: 0,
      },
      media: {
        ...previewMedia,
        title: 'BPM 自動偵測預覽',
        artist: 'Karaoke Kaiju QA',
      },
      mediaError: null,
      queue: EMPTY_PLAYBACK_QUEUE,
    };
  }
}
let lastPreviewTick = performance.now();

export function isExtensionRuntime(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
}

export function getInitialState(): ExtensionState {
  return isExtensionRuntime()
    ? {
        audio: EMPTY_AUDIO_SESSION,
        media: EMPTY_MEDIA_STATE,
        mediaError: null,
        queue: EMPTY_PLAYBACK_QUEUE,
      }
    : structuredClone(previewState);
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isExtensionRuntime()) {
    await chrome.tabs.create({ url });
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function sendBackgroundRequest<T = unknown>(
  request: SidePanelRequest,
): Promise<ExtensionResponse<T>> {
  if (isExtensionRuntime()) {
    try {
      const response = await chrome.runtime.sendMessage<SidePanelRequest, ExtensionResponse<T>>(request);
      if (!response) {
        return { ok: false, error: '擴充功能沒有回應' };
      }
      return response;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes('message channel closed before a response was received') ||
        msg.includes('Extension context invalidated')
      ) {
        // Tab navigated or reloaded during execution
        return { ok: true, data: undefined as T };
      }
      return { ok: false, error: msg };
    }
  }

  return handlePreviewRequest(request) as ExtensionResponse<T>;
}

function handlePreviewRequest(request: SidePanelRequest): ExtensionResponse {
  updatePreviewClock();

  switch (request.type) {
    case 'GET_EXTENSION_STATE':
      return { ok: true, data: structuredClone(previewState) };
    case 'START_AUDIO':
      previewState.audio = { ...previewState.audio, status: 'active', error: null };
      return { ok: true, data: structuredClone(previewState.audio) };
    case 'STOP_AUDIO':
      previewState.audio = { ...previewState.audio, status: 'idle', error: null };
      return { ok: true, data: structuredClone(previewState.audio) };
    case 'ANALYZE_BPM':
      return {
        ok: true,
        data: { bpm: 120, confidence: 0.86, sampleSeconds: request.sampleSeconds ?? 8 },
      };
    case 'SET_PITCH':
      previewState.audio = {
        ...previewState.audio,
        pitchSemitones: request.semitones,
        pitchCents: request.cents,
      };
      return { ok: true, data: structuredClone(previewState.audio) };
    case 'SET_AUDIO_QUALITY':
      previewState.audio = {
        ...previewState.audio,
        formantStrength: request.formantStrength,
      };
      return { ok: true, data: structuredClone(previewState.audio) };
    case 'TRANSCRIBE_TAB_AUDIO':
      return {
        ok: true,
        data: {
          text: '從目前分頁錄製並產生動態歌詞',
          language: 'Chinese',
          duration: Math.min(8, request.durationSeconds),
          segments: [
            { id: 0, start: 0, end: 3.8, text: '從目前分頁錄製' },
            { id: 1, start: 3.8, end: 7.6, text: '並產生動態歌詞' },
          ],
          words: [
            { word: '從目前分頁', start: 0, end: 1.9 },
            { word: '錄製', start: 1.9, end: 3.8 },
            { word: '並產生', start: 3.8, end: 5.7 },
            { word: '動態歌詞', start: 5.7, end: 7.6 },
          ],
        },
      };
    case 'CANCEL_TAB_TRANSCRIPTION':
      return { ok: true };
    case 'MEDIA_COMMAND':
      applyPreviewMediaCommand(request.command);
      return { ok: true, data: structuredClone(previewState.media) };
    case 'PLAY_PLAYLIST_TRACK':
      previewState.queue = {
        status: 'playing',
        tabId: 1,
        playlistId: request.playlistId,
        currentTrackId: request.trackId,
        index: 0,
        total: 1,
        mode: request.mode,
        error: null,
      };
      return { ok: true, data: structuredClone(previewState.queue) };
    case 'PLAY_RECENT_TRACK':
      previewState.audio = {
        ...previewState.audio,
        pitchSemitones: request.track.practice.pitchSemitones,
        pitchCents: request.track.practice.pitchCents,
      };
      previewState.media = {
        ...previewState.media,
        title: request.track.title,
        artist: request.track.artist,
        url: request.track.url,
        playbackRate: request.track.practice.speed,
        loop: {
          start: request.track.practice.loopStart,
          end: request.track.practice.loopEnd,
          enabled: request.track.practice.loopEnabled,
        },
      };
      previewState.queue = {
        status: 'playing',
        tabId: 1,
        playlistId: null,
        currentTrackId: request.track.id,
        index: 0,
        total: 1,
        mode: 'sequential',
        error: null,
      };
      return { ok: true, data: structuredClone(previewState.queue) };
    case 'SET_PLAYBACK_MODE':
      previewState.queue = { ...previewState.queue, mode: request.mode };
      return { ok: true, data: structuredClone(previewState.queue) };
    case 'SKIP_PLAYLIST_TRACK':
      return { ok: true, data: structuredClone(previewState.queue) };
    case 'SET_VOCAL_REDUCTION':
      previewState.audio = { ...previewState.audio, vocalReduction: request.strength };
      return { ok: true, data: structuredClone(previewState.audio) };
    case 'SET_VOCAL_MIX':
      previewState.audio = {
        ...previewState.audio,
        vocalMix: { musicVolume: request.musicVolume, vocalVolume: request.vocalVolume },
      };
      return { ok: true, data: structuredClone(previewState.audio) };
    case 'SET_EQUALIZER':
      previewState.audio = { ...previewState.audio, equalizer: { low: request.low, mid: request.mid, high: request.high } };
      return { ok: true, data: structuredClone(previewState.audio) };
    case 'SET_VARISPEED':
      previewState.audio = { ...previewState.audio, varispeed: request.enabled };
      return { ok: true, data: structuredClone(previewState.audio) };
    case 'OPEN_MEDIA_TAB':
      return { ok: true };
  }
}

function applyPreviewMediaCommand(command: MediaCommand): void {
  const media = previewState.media;
  switch (command.kind) {
    case 'SET_SPEED':
      media.playbackRate = command.speed;
      break;
    case 'SET_LOOP_POINT':
      media.loop = {
        ...media.loop,
        [command.point]: media.currentTime,
        enabled: false,
      };
      break;
    case 'TOGGLE_LOOP':
      media.loop = { ...media.loop, enabled: !media.loop.enabled };
      break;
    case 'CLEAR_LOOP':
      media.loop = { start: null, end: null, enabled: false };
      break;
    case 'TOGGLE_PLAYBACK':
      media.paused = !media.paused;
      break;
    case 'SEEK_RELATIVE':
      media.currentTime = Math.min(media.duration, Math.max(0, media.currentTime + command.seconds));
      break;
    case 'APPLY_PRACTICE_PRESET':
      media.playbackRate = command.speed;
      media.loop = {
        start: command.loopStart,
        end: command.loopEnd,
        enabled: command.loopEnabled,
      };
      media.currentTime = command.loopEnabled && command.loopStart !== null ? command.loopStart : 0;
      media.paused = !command.autoplay;
      break;
    case 'SET_TRACK_REPEAT':
      break;
    case 'SET_LOOP_CLIP':
      media.loop = {
        start: command.clip.start,
        end: command.clip.end,
        enabled: true,
        activeClipId: command.clip.id,
        clips: media.loop.clips,
      };
      media.currentTime = command.clip.start;
      if (command.clip.speed) media.playbackRate = command.clip.speed;
      break;
    case 'SAVE_CURRENT_CLIP': {
      const start = media.loop.start ?? 0;
      const end = media.loop.end ?? (media.duration || 10);
      const newClip = {
        id: `clip-${Date.now()}`,
        name: command.name || `片段 ${(media.loop.clips?.length ?? 0) + 1}`,
        start: Math.min(start, end),
        end: Math.max(start, end),
        speed: media.playbackRate,
      };
      const existing = media.loop.clips ?? [];
      media.loop = {
        ...media.loop,
        activeClipId: newClip.id,
        clips: [...existing, newClip],
      };
      break;
    }
    case 'DELETE_LOOP_CLIP': {
      const nextClips = (media.loop.clips ?? []).filter((c) => c.id !== command.clipId);
      media.loop = {
        ...media.loop,
        activeClipId: media.loop.activeClipId === command.clipId ? null : media.loop.activeClipId,
        clips: nextClips,
      };
      break;
    }
    case 'SET_LYRICS_OVERLAY':
      break;
    case 'GET_MEDIA_STATE':
      break;
  }
}

function updatePreviewClock(): void {
  const now = performance.now();
  const elapsedSeconds = (now - lastPreviewTick) / 1000;
  lastPreviewTick = now;

  if (!previewState.media.paused) {
    previewState.media.currentTime += elapsedSeconds * previewState.media.playbackRate;
    const { loop } = previewState.media;
    if (loop.enabled && loop.start !== null && loop.end !== null && previewState.media.currentTime >= loop.end) {
      previewState.media.currentTime = loop.start;
    }
  }
}
