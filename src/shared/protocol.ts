export type AudioEngineStatus = 'idle' | 'starting' | 'active' | 'error';

export interface AudioSessionState {
  status: AudioEngineStatus;
  tabId: number | null;
  pitchSemitones: number;
  pitchCents: number;
  formantStrength: number;
  baseLatencyMs: number | null;
  underrunCount: number;
  vocalReduction?: number;
  vocalMix?: { musicVolume: number; vocalVolume: number };
  equalizer?: { low: number; mid: number; high: number };
  varispeed?: boolean;
  error: string | null;
}

export interface BpmAnalysisResult {
  bpm: number;
  confidence: number;
  sampleSeconds: number;
}

export interface LoopState {
  start: number | null;
  end: number | null;
  enabled: boolean;
  activeClipId?: string | null;
  clips?: LoopClip[];
}

export interface LoopClip {
  id: string;
  name: string;
  start: number;
  end: number;
  pitchSemitones?: number;
  pitchCents?: number;
  speed?: number;
}

export interface PracticeSequenceStep {
  speed: number;
  reps: number;
}

export interface MediaState {
  available: boolean;
  title: string;
  artist: string;
  platform: string;
  url: string;
  duration: number;
  currentTime: number;
  paused: boolean;
  playbackRate: number;
  loop: LoopState;
}

export interface ExtensionState {
  audio: AudioSessionState;
  media: MediaState;
  mediaError: string | null;
  queue: PlaybackQueueState;
}

export type PlaybackMode = 'sequential' | 'repeat-one';
export type PlaybackQueueStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface PlaybackQueueState {
  status: PlaybackQueueStatus;
  tabId: number | null;
  playlistId: string | null;
  currentTrackId: string | null;
  index: number;
  total: number;
  mode: PlaybackMode;
  error: string | null;
}

export interface PlaybackTrack {
  id: string;
  url: string;
  title: string;
  artist: string;
  platform: string;
  duration: number;
  addedAt: number;
  practice: {
    pitchSemitones: number;
    pitchCents: number;
    speed: number;
    loopStart: number | null;
    loopEnd: number | null;
    loopEnabled: boolean;
  };
}

export type LyricsLayoutMode = 'dock-bottom' | 'video-overlay' | 'ktv-stage';

export interface LyricsOverlayPayload {
  title: string;
  visible: boolean;
  offsetMs: number;
  fontScale: number;
  panelOpacity: number;
  verticalOffset: number;
  leadTimeSeconds?: number;
  layoutMode?: LyricsLayoutMode;
  dockHeightPercent?: number;
  lines: import('./lyrics').TimedLyricLine[];
}

export type MediaCommand =
  | { kind: 'GET_MEDIA_STATE' }
  | { kind: 'SET_SPEED'; speed: number }
  | { kind: 'SET_LOOP_POINT'; point: 'start' | 'end' }
  | { kind: 'TOGGLE_LOOP' }
  | { kind: 'CLEAR_LOOP' }
  | { kind: 'TOGGLE_PLAYBACK' }
  | { kind: 'SEEK_RELATIVE'; seconds: number }
  | { kind: 'SEEK_ABSOLUTE'; seconds: number }
  | { kind: 'SET_PLAYBACK'; paused: boolean }
  | {
      kind: 'APPLY_PRACTICE_PRESET';
      speed: number;
      loopStart: number | null;
      loopEnd: number | null;
      loopEnabled: boolean;
      repeatTrack: boolean;
      autoplay: boolean;
    }
  | { kind: 'SET_TRACK_REPEAT'; enabled: boolean }
  | { kind: 'SET_LOOP_CLIP'; clip: LoopClip }
  | { kind: 'SAVE_CURRENT_CLIP'; name: string }
  | { kind: 'DELETE_LOOP_CLIP'; clipId: string }
  | { kind: 'SET_LYRICS_OVERLAY'; lyrics: LyricsOverlayPayload | null };

export type SidePanelRequest =
  | { target: 'background'; type: 'GET_EXTENSION_STATE' }
  | { target: 'background'; type: 'START_AUDIO' }
  | { target: 'background'; type: 'STOP_AUDIO' }
  | { target: 'background'; type: 'ANALYZE_BPM'; sampleSeconds?: number }
  | { target: 'background'; type: 'SET_PITCH'; semitones: number; cents: number }
  | { target: 'background'; type: 'SET_AUDIO_QUALITY'; formantStrength: number }
  | {
      target: 'background';
      type: 'TRANSCRIBE_TAB_AUDIO';
      apiKey: string;
      songContext: string;
      durationSeconds: number;
      qaDryRun?: boolean;
    }
  | { target: 'background'; type: 'CANCEL_TAB_TRANSCRIPTION' }
  | { target: 'background'; type: 'MEDIA_COMMAND'; command: MediaCommand }
  | {
      target: 'background';
      type: 'PLAY_PLAYLIST_TRACK';
      playlistId: string;
      trackId: string;
      mode: PlaybackMode;
    }
  | {
      target: 'background';
      type: 'PLAY_RECENT_TRACK';
      track: PlaybackTrack;
    }
  | { target: 'background'; type: 'SET_PLAYBACK_MODE'; mode: PlaybackMode }
  | { target: 'background'; type: 'SKIP_PLAYLIST_TRACK'; direction: 'previous' | 'next' }
  | { target: 'background'; type: 'SET_VOCAL_REDUCTION'; strength: number }
  | { target: 'background'; type: 'SET_VOCAL_MIX'; musicVolume: number; vocalVolume: number }
  | { target: 'background'; type: 'SET_EQUALIZER'; low: number; mid: number; high: number }
  | { target: 'background'; type: 'SET_VARISPEED'; enabled: boolean }
  | { target: 'background'; type: 'OPEN_MEDIA_TAB' };

export type OffscreenRequest =
  | {
      target: 'offscreen';
      type: 'START_CAPTURE';
      streamId: string;
      tabId: number;
      pitchSemitones: number;
      pitchCents: number;
      formantStrength: number;
      vocalReduction?: number;
      equalizer?: { low: number; mid: number; high: number };
      varispeed?: boolean;
    }
  | { target: 'offscreen'; type: 'STOP_CAPTURE' }
  | { target: 'offscreen'; type: 'ANALYZE_BPM'; sampleSeconds?: number }
  | {
      target: 'offscreen';
      type: 'TRANSCRIBE_CAPTURE';
      apiKey: string;
      songContext: string;
      durationSeconds: number;
      qaDryRun?: boolean;
    }
  | { target: 'offscreen'; type: 'CANCEL_TRANSCRIPTION' }
  | { target: 'offscreen'; type: 'SET_PITCH'; semitones: number; cents: number }
  | { target: 'offscreen'; type: 'SET_FORMANT_STRENGTH'; formantStrength: number }
  | { target: 'offscreen'; type: 'SET_VOCAL_REDUCTION'; strength: number }
  | { target: 'offscreen'; type: 'SET_VOCAL_MIX'; musicVolume: number; vocalVolume: number }
  | { target: 'offscreen'; type: 'SET_EQUALIZER'; low: number; mid: number; high: number }
  | { target: 'offscreen'; type: 'SET_VARISPEED'; enabled: boolean };

export type BackgroundEvent =
  | {
      target: 'background';
      type: 'OFFSCREEN_STATE';
      state: Pick<AudioSessionState, 'status' | 'baseLatencyMs' | 'underrunCount' | 'error'>;
    }
  | { target: 'background'; type: 'TAB_TRANSCRIPTION_RECORDING_READY'; tabId: number }
  | { target: 'background'; type: 'MEDIA_ENDED' };

export interface ExtensionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export const EMPTY_MEDIA_STATE: MediaState = {
  available: false,
  title: '尚未找到媒體',
  artist: '請先開啟 YouTube 或網頁音樂',
  platform: '網頁媒體',
  url: '',
  duration: 0,
  currentTime: 0,
  paused: true,
  playbackRate: 1,
  loop: {
    start: null,
    end: null,
    enabled: false,
  },
};

export const EMPTY_AUDIO_SESSION: AudioSessionState = {
  status: 'idle',
  tabId: null,
  pitchSemitones: 0,
  pitchCents: 0,
  formantStrength: 1,
  baseLatencyMs: null,
  underrunCount: 0,
  error: null,
};

export const EMPTY_PLAYBACK_QUEUE: PlaybackQueueState = {
  status: 'idle',
  tabId: null,
  playlistId: null,
  currentTrackId: null,
  index: -1,
  total: 0,
  mode: 'sequential',
  error: null,
};
