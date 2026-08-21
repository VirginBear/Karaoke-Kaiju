import {
  FormantCorrectionNode,
  type ProcessorMetrics,
} from '@soundtouchjs/formant-correction-worklet';
import formantProcessorUrl from '@soundtouchjs/formant-correction-worklet/processor?url';
import { clamp, MAX_SEMITONES, MIN_SEMITONES, semitoneToRatio } from '../shared/audio';
import { estimateBpmFromEnvelope } from '../shared/bpm';
import { requestGroqTranscription } from '../shared/groq';
import type {
  AudioSessionState,
  BackgroundEvent,
  ExtensionResponse,
  OffscreenRequest,
} from '../shared/protocol';

let audioContext: AudioContext | null = null;
let mediaStream: MediaStream | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let pitchNode: FormantCorrectionNode | null = null;
let vocalMidGain: GainNode | null = null;
let vocalSideGain: GainNode | null = null;
let vocalBassGain: GainNode | null = null;
let vocalSideInvert: GainNode | null = null;
let vocalMerger: ChannelMergerNode | null = null;
let eqLowNode: BiquadFilterNode | null = null;
let eqMidNode: BiquadFilterNode | null = null;
let eqHighNode: BiquadFilterNode | null = null;
let vocalNotchNode: BiquadFilterNode | null = null;
let vocalAirNode: BiquadFilterNode | null = null;
let lastMetricsSentAt = 0;
let currentPitch = 0;
let currentCents = 0;
let currentFormantStrength = 1;
let currentMusicVolume = 1.0;
let currentVocalVolume = 1.0;
let currentEqualizer = { low: 0, mid: 0, high: 0 };
let currentVarispeed = false;
let currentTabId: number | null = null;
let activeRecorder: MediaRecorder | null = null;
let activeRecordingTimer: number | null = null;
let activeTranscriptionAbort: AbortController | null = null;
let transcriptionActive = false;
let transcriptionCancelled = false;

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isOffscreenRequest(message)) {
    return false;
  }

  void handleRequest(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : '音訊處理失敗';
      if (
        message.type !== 'TRANSCRIBE_CAPTURE' &&
        message.type !== 'CANCEL_TRANSCRIPTION' &&
        message.type !== 'ANALYZE_BPM'
      ) {
        void notifyBackground({
          status: 'error',
          baseLatencyMs: null,
          underrunCount: 0,
          error: errorMessage,
        });
      }
      sendResponse({ ok: false, error: errorMessage } satisfies ExtensionResponse);
    });
  return true;
});

async function handleRequest(request: OffscreenRequest): Promise<ExtensionResponse> {
  switch (request.type) {
    case 'START_CAPTURE':
      await startCapture(
        request.streamId,
        request.tabId,
        request.pitchSemitones,
        request.pitchCents,
        request.formantStrength,
      );
      return { ok: true };
    case 'STOP_CAPTURE':
      await stopCapture();
      return { ok: true };
    case 'ANALYZE_BPM':
      return { ok: true, data: await analyzeBpm(request.sampleSeconds) };
    case 'TRANSCRIBE_CAPTURE':
      return {
        ok: true,
        data: await transcribeCapture(
          request.apiKey,
          request.songContext,
          request.durationSeconds,
          request.qaDryRun,
        ),
      };
    case 'CANCEL_TRANSCRIPTION':
      cancelActiveTranscription();
      return { ok: true };
    case 'SET_PITCH':
      setPitch(request.semitones, request.cents);
      return { ok: true };
    case 'SET_FORMANT_STRENGTH':
      setFormantStrength(request.formantStrength);
      return { ok: true };
    case 'SET_VOCAL_REDUCTION':
      setVocalMix(1.0, 1.0 - request.strength);
      return { ok: true };
    case 'SET_VOCAL_MIX':
      setVocalMix(request.musicVolume, request.vocalVolume);
      return { ok: true };
    case 'SET_EQUALIZER':
      setEqualizer(request.low, request.mid, request.high);
      return { ok: true };
    case 'SET_VARISPEED':
      setVarispeed(request.enabled);
      return { ok: true };
  }
}

async function startCapture(
  streamId: string,
  tabId: number,
  semitones: number,
  cents: number,
  formantStrength: number,
): Promise<void> {
  await stopCapture(false);
  currentTabId = tabId;
  currentPitch = Math.round(clamp(semitones, MIN_SEMITONES, MAX_SEMITONES));
  currentCents = Math.round(clamp(cents, -100, 100));
  currentFormantStrength = clamp(formantStrength, 0, 1);

  await notifyBackground({
    status: 'starting',
    baseLatencyMs: null,
    underrunCount: 0,
    error: null,
  });

  const streamConstraints = {
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  } as unknown as MediaStreamConstraints;

  mediaStream = await navigator.mediaDevices.getUserMedia(streamConstraints);
  audioContext = new AudioContext({ latencyHint: 'interactive' });
  await audioContext.resume();
  await FormantCorrectionNode.register(audioContext, formantProcessorUrl);

  sourceNode = audioContext.createMediaStreamSource(mediaStream);
  pitchNode = new FormantCorrectionNode({ context: audioContext, outputChannelCount: 2 });

  // ── Vocal Mix Pipeline: Mid-Side Matrix with Independent Volume Control ──
  // M = (L+R), S = (L-R); scale each by 0.5 via gain nodes
  // Reconstruction: L_out = M_scaled + S_scaled, R_out = M_scaled - S_scaled
  vocalMerger = audioContext.createChannelMerger(2);

  const vocalSplitter = audioContext.createChannelSplitter(2);

  // Mid (vocal estimate) = L + R
  const midLeftGain = audioContext.createGain();
  midLeftGain.gain.value = 1;
  const midRightGain = audioContext.createGain();
  midRightGain.gain.value = 1;
  const midSum = audioContext.createGain();
  midSum.channelCount = 1;
  midSum.channelCountMode = 'explicit';

  // Side (accompaniment estimate) = L - R
  const sideLeftGain = audioContext.createGain();
  sideLeftGain.gain.value = 1;
  const sideRightGain = audioContext.createGain();
  sideRightGain.gain.value = -1;
  const sideSum = audioContext.createGain();
  sideSum.channelCount = 1;
  sideSum.channelCountMode = 'explicit';

  // Vocal formant notch (only active when reducing vocals)
  const vocalCutAmount = Math.max(0, 1 - currentVocalVolume);
  vocalNotchNode = audioContext.createBiquadFilter();
  vocalNotchNode.type = 'peaking';
  vocalNotchNode.frequency.setValueAtTime(1500, audioContext.currentTime);
  vocalNotchNode.Q.setValueAtTime(2.2, audioContext.currentTime);
  vocalNotchNode.gain.setValueAtTime(-14 * vocalCutAmount, audioContext.currentTime);

  // Air preservation on side channel
  vocalAirNode = audioContext.createBiquadFilter();
  vocalAirNode.type = 'highshelf';
  vocalAirNode.frequency.setValueAtTime(9000, audioContext.currentTime);
  vocalAirNode.gain.setValueAtTime(2.5 * vocalCutAmount, audioContext.currentTime);

  // Volume controls (include 0.5 factor for M-S scaling)
  vocalMidGain = audioContext.createGain();
  vocalMidGain.gain.setValueAtTime(currentVocalVolume * 0.5, audioContext.currentTime);

  vocalSideGain = audioContext.createGain();
  vocalSideGain.gain.setValueAtTime(currentMusicVolume * 0.5, audioContext.currentTime);

  // Side inversion for right channel (R = M - S)
  vocalSideInvert = audioContext.createGain();
  vocalSideInvert.gain.setValueAtTime(-1, audioContext.currentTime);

  // Bass direct path (compensates for bass lost when reducing mid/vocals)
  const bassFilter = audioContext.createBiquadFilter();
  bassFilter.type = 'lowpass';
  bassFilter.frequency.setValueAtTime(140, audioContext.currentTime);
  vocalBassGain = audioContext.createGain();
  vocalBassGain.gain.setValueAtTime(Math.max(0, 1 - currentVocalVolume) * 0.5, audioContext.currentTime);

  // ── Connections: M-S Encoding ──
  sourceNode.connect(vocalSplitter);

  vocalSplitter.connect(midLeftGain, 0);
  vocalSplitter.connect(midRightGain, 1);
  midLeftGain.connect(midSum);
  midRightGain.connect(midSum);

  vocalSplitter.connect(sideLeftGain, 0);
  vocalSplitter.connect(sideRightGain, 1);
  sideLeftGain.connect(sideSum);
  sideRightGain.connect(sideSum);

  // ── Processing ──
  midSum.connect(vocalNotchNode);
  vocalNotchNode.connect(vocalMidGain);

  sideSum.connect(vocalAirNode);
  vocalAirNode.connect(vocalSideGain);

  // ── M-S Decoding: L = M + S, R = M - S ──
  vocalMidGain.connect(vocalMerger, 0, 0);   // M → left
  vocalMidGain.connect(vocalMerger, 0, 1);   // M → right
  vocalSideGain.connect(vocalMerger, 0, 0);  // +S → left
  vocalSideGain.connect(vocalSideInvert);
  vocalSideInvert.connect(vocalMerger, 0, 1); // -S → right

  // ── Bass direct path ──
  sourceNode.connect(bassFilter);
  bassFilter.connect(vocalBassGain);
  vocalBassGain.connect(vocalMerger, 0, 0);
  vocalBassGain.connect(vocalMerger, 0, 1);

  vocalMerger.connect(pitchNode);

  // Equalizer Pipeline
  eqLowNode = audioContext.createBiquadFilter();
  eqLowNode.type = 'lowshelf';
  eqLowNode.frequency.setValueAtTime(100, audioContext.currentTime);
  eqLowNode.gain.setValueAtTime(currentEqualizer.low, audioContext.currentTime);

  eqMidNode = audioContext.createBiquadFilter();
  eqMidNode.type = 'peaking';
  eqMidNode.frequency.setValueAtTime(1000, audioContext.currentTime);
  eqMidNode.Q.setValueAtTime(1.0, audioContext.currentTime);
  eqMidNode.gain.setValueAtTime(currentEqualizer.mid, audioContext.currentTime);

  eqHighNode = audioContext.createBiquadFilter();
  eqHighNode.type = 'highshelf';
  eqHighNode.frequency.setValueAtTime(8000, audioContext.currentTime);
  eqHighNode.gain.setValueAtTime(currentEqualizer.high, audioContext.currentTime);

  pitchNode.pitch.setValueAtTime(semitoneToRatio(0, currentCents), audioContext.currentTime);
  pitchNode.pitchSemitones.setValueAtTime(currentVarispeed ? 0 : currentPitch, audioContext.currentTime);
  pitchNode.playbackRate.setValueAtTime(currentVarispeed ? semitoneToRatio(currentPitch, currentCents) : 1, audioContext.currentTime);
  pitchNode.formantStrength.setValueAtTime(currentFormantStrength, audioContext.currentTime);
  applyStretchQuality();
  pitchNode.addEventListener('metrics', handleMetrics as EventListener);

  pitchNode.connect(eqLowNode);
  eqLowNode.connect(eqMidNode);
  eqMidNode.connect(eqHighNode);
  eqHighNode.connect(audioContext.destination);

  for (const track of mediaStream.getAudioTracks()) {
    track.addEventListener('ended', () => void stopCapture(), { once: true });
  }

  await notifyBackground({
    status: 'active',
    baseLatencyMs: getLatencyMs(audioContext),
    underrunCount: 0,
    error: null,
  });
}

function setPitch(semitones: number, cents: number): void {
  currentPitch = Math.round(clamp(semitones, MIN_SEMITONES, MAX_SEMITONES));
  currentCents = Math.round(clamp(cents, -100, 100));
  if (!pitchNode || !audioContext) {
    return;
  }

  if (currentVarispeed) {
    pitchNode.pitchSemitones.setValueAtTime(0, audioContext.currentTime);
    pitchNode.playbackRate.cancelScheduledValues(audioContext.currentTime);
    pitchNode.playbackRate.setTargetAtTime(semitoneToRatio(currentPitch, currentCents), audioContext.currentTime, 0.018);
  } else {
    pitchNode.playbackRate.setValueAtTime(1, audioContext.currentTime);
    pitchNode.pitchSemitones.cancelScheduledValues(audioContext.currentTime);
    pitchNode.pitchSemitones.setTargetAtTime(currentPitch, audioContext.currentTime, 0.018);
    pitchNode.pitch.cancelScheduledValues(audioContext.currentTime);
    pitchNode.pitch.setTargetAtTime(semitoneToRatio(0, currentCents), audioContext.currentTime, 0.018);
  }
}

function setVocalMix(musicVolume: number, vocalVolume: number): void {
  currentMusicVolume = clamp(musicVolume, 0, 2);
  currentVocalVolume = clamp(vocalVolume, 0, 2);
  if (!audioContext) return;
  const t = audioContext.currentTime;
  const tc = 0.02;
  const vocalCut = Math.max(0, 1 - currentVocalVolume);

  if (vocalMidGain) {
    vocalMidGain.gain.setTargetAtTime(currentVocalVolume * 0.5, t, tc);
  }
  if (vocalSideGain) {
    vocalSideGain.gain.setTargetAtTime(currentMusicVolume * 0.5, t, tc);
  }
  if (vocalBassGain) {
    vocalBassGain.gain.setTargetAtTime(Math.max(0, 1 - currentVocalVolume) * 0.5, t, tc);
  }
  if (vocalNotchNode) {
    vocalNotchNode.gain.setTargetAtTime(-14 * vocalCut, t, tc);
  }
  if (vocalAirNode) {
    vocalAirNode.gain.setTargetAtTime(2.5 * vocalCut, t, tc);
  }
}



function setEqualizer(low: number, mid: number, high: number): void {
  currentEqualizer = {
    low: clamp(low, -12, 12),
    mid: clamp(mid, -12, 12),
    high: clamp(high, -12, 12),
  };
  if (!eqLowNode || !eqMidNode || !eqHighNode || !audioContext) {
    return;
  }
  eqLowNode.gain.setTargetAtTime(currentEqualizer.low, audioContext.currentTime, 0.02);
  eqMidNode.gain.setTargetAtTime(currentEqualizer.mid, audioContext.currentTime, 0.02);
  eqHighNode.gain.setTargetAtTime(currentEqualizer.high, audioContext.currentTime, 0.02);
}

function setVarispeed(enabled: boolean): void {
  currentVarispeed = enabled;
  if (!pitchNode || !audioContext) {
    return;
  }
  setPitch(currentPitch, currentCents);
}

async function analyzeBpm(requestedSeconds = 8): Promise<{
  bpm: number;
  confidence: number;
  sampleSeconds: number;
}> {
  if (!audioContext || !sourceNode || audioContext.state === 'closed') {
    throw new Error('請先開始音訊處理，再進行 BPM 自動偵測');
  }

  const sampleSeconds = clamp(requestedSeconds, 4, 12);
  const envelopeSampleRate = 20;
  const sampleCount = Math.ceil(sampleSeconds * envelopeSampleRate);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.12;
  const frame = new Float32Array(analyser.fftSize);
  const envelope: number[] = [];
  const source = sourceNode;

  source.connect(analyser);
  try {
    for (let index = 0; index < sampleCount; index += 1) {
      analyser.getFloatTimeDomainData(frame);
      let sumSquares = 0;
      for (const value of frame) {
        sumSquares += value * value;
      }
      envelope.push(Math.sqrt(sumSquares / frame.length));
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1000 / envelopeSampleRate));
    }
  } finally {
    try {
      source.disconnect(analyser);
    } catch {
      // The capture may have been stopped while the analysis was sampling.
    }
    analyser.disconnect();
  }

  const estimate = estimateBpmFromEnvelope(envelope, envelopeSampleRate);
  if (!estimate) {
    throw new Error('目前音訊的節奏不夠明顯，請播放鼓點較清楚的段落後再試一次');
  }

  return {
    ...estimate,
    sampleSeconds: envelope.length / envelopeSampleRate,
  };
}

function setFormantStrength(formantStrength: number): void {
  currentFormantStrength = clamp(formantStrength, 0, 1);
  if (!pitchNode || !audioContext) {
    return;
  }

  pitchNode.formantStrength.cancelScheduledValues(audioContext.currentTime);
  pitchNode.formantStrength.setTargetAtTime(
    currentFormantStrength,
    audioContext.currentTime,
    0.025,
  );
  applyStretchQuality();
}

function applyStretchQuality(): void {
  pitchNode?.setStretchParameters({
    overlapMs: currentFormantStrength >= 0.5 ? 12 : 8,
    quickSeek: currentFormantStrength < 0.5,
  });
}

async function stopCapture(notify = true): Promise<void> {
  cancelActiveTranscription();
  if (pitchNode) {
    pitchNode.removeEventListener('metrics', handleMetrics as EventListener);
    pitchNode.disconnect();
    pitchNode = null;
  }

  sourceNode?.disconnect();
  sourceNode = null;

  for (const track of mediaStream?.getTracks() ?? []) {
    track.stop();
  }
  mediaStream = null;
  currentTabId = null;

  if (audioContext && audioContext.state !== 'closed') {
    await audioContext.close();
  }
  audioContext = null;

  if (notify) {
    await notifyBackground({
      status: 'idle',
      baseLatencyMs: null,
      underrunCount: 0,
      error: null,
    });
  }
}

async function transcribeCapture(
  apiKey: string,
  songContext: string,
  durationSeconds: number,
  qaDryRun = false,
): Promise<import('../shared/lyrics').GroqTranscription> {
  if (!mediaStream?.active || currentTabId === null) {
    throw new Error('請先在目前的 YouTube／YouTube Music 分頁啟動音訊處理');
  }
  if (transcriptionActive) {
    throw new Error('目前已有一個分頁 AI 歌詞工作正在進行');
  }

  transcriptionActive = true;
  transcriptionCancelled = false;
  try {
    const mimeType = selectRecordingMimeType();
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(mediaStream, {
      ...(mimeType ? { mimeType } : {}),
      audioBitsPerSecond: 64_000,
    });
    activeRecorder = recorder;

    const recording = new Promise<Blob>((resolve, reject) => {
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      recorder.addEventListener('error', () => reject(new Error('無法錄製目前分頁的音訊')));
      recorder.addEventListener('stop', () => {
        if (activeRecordingTimer !== null) window.clearTimeout(activeRecordingTimer);
        activeRecordingTimer = null;
        activeRecorder = null;
        if (transcriptionCancelled) {
          reject(new Error('已取消目前分頁的 AI 歌詞工作'));
          return;
        }
        resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      }, { once: true });
    });

    recorder.start(1_000);
    await notifyRecordingReady(currentTabId);
    activeRecordingTimer = window.setTimeout(
      () => {
        if (recorder.state !== 'inactive') recorder.stop();
      },
      Math.round(clamp(durationSeconds, 1, 900) * 1_000),
    );

    const audioBlob = await recording;
    if (qaDryRun) {
      return {
        text: `qa-capture-${audioBlob.size}`,
        segments: [{ start: 0, end: clamp(durationSeconds, 1, 900), text: 'QA capture' }],
        words: [{ word: 'QA capture', start: 0, end: clamp(durationSeconds, 1, 900) }],
      };
    }
    activeTranscriptionAbort = new AbortController();
    try {
      return await requestGroqTranscription({
        apiKey,
        file: audioBlob,
        fileName: 'current-tab-audio.webm',
        songContext,
        signal: activeTranscriptionAbort.signal,
      });
    } catch (error) {
      if (transcriptionCancelled || (error instanceof DOMException && error.name === 'AbortError')) {
        throw new Error('已取消目前分頁的 AI 歌詞工作');
      }
      throw error;
    } finally {
      activeTranscriptionAbort = null;
    }
  } finally {
    transcriptionActive = false;
    if (activeRecorder?.state !== 'inactive') {
      transcriptionCancelled = true;
      activeRecorder?.stop();
    }
    activeRecorder = null;
    if (activeRecordingTimer !== null) window.clearTimeout(activeRecordingTimer);
    activeRecordingTimer = null;
  }
}

function cancelActiveTranscription(): void {
  if (!transcriptionActive) return;
  transcriptionCancelled = true;
  if (activeRecordingTimer !== null) window.clearTimeout(activeRecordingTimer);
  activeRecordingTimer = null;
  if (activeRecorder?.state !== 'inactive') activeRecorder?.stop();
  activeTranscriptionAbort?.abort();
}

function selectRecordingMimeType(): string {
  return ['audio/webm;codecs=opus', 'audio/webm']
    .find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

async function notifyRecordingReady(tabId: number): Promise<void> {
  const event: BackgroundEvent = {
    target: 'background',
    type: 'TAB_TRANSCRIPTION_RECORDING_READY',
    tabId,
  };
  const response = await chrome.runtime.sendMessage(event);
  if (!response?.ok) {
    throw new Error(response?.error ?? '無法從歌曲開頭播放目前分頁');
  }
}

function handleMetrics(event: CustomEvent<ProcessorMetrics>): void {
  const now = performance.now();
  if (now - lastMetricsSentAt < 800) {
    return;
  }
  lastMetricsSentAt = now;

  void notifyBackground({
    status: 'active',
    baseLatencyMs: audioContext ? getLatencyMs(audioContext) : null,
    underrunCount: event.detail.underrunCount,
    error: null,
  });
}

function getLatencyMs(context: AudioContext): number {
  return Math.round((context.baseLatency + (context.outputLatency ?? 0)) * 1000);
}

async function notifyBackground(
  state: Pick<AudioSessionState, 'status' | 'baseLatencyMs' | 'underrunCount' | 'error'>,
): Promise<void> {
  const event: BackgroundEvent = {
    target: 'background',
    type: 'OFFSCREEN_STATE',
    state,
  };
  await chrome.runtime.sendMessage(event).catch(() => undefined);
}

function isOffscreenRequest(value: unknown): value is OffscreenRequest {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'target' in value &&
      value.target === 'offscreen' &&
      'type' in value,
  );
}
