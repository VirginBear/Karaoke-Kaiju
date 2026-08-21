import { clamp, MAX_SEMITONES, MIN_SEMITONES } from '../shared/audio';
import { describeCaptureError } from '../shared/capture';
import { requestGroqTranscription } from '../shared/groq';
import {
  downloadAudioFormatBlob,
  extractYouTubeVideoId,
  fetchYouTubeAudioBlob,
  selectOptimalAudioFormat,
  type YouTubeAdaptiveFormat,
} from '../shared/youtube-audio';
import {
  EMPTY_PLAYLIST_LIBRARY,
  PLAYLIST_LIBRARY_STORAGE_KEY,
  normalizeTrackUrl,
  type PlaylistLibrary,
} from '../shared/library';
import {
  EMPTY_AUDIO_SESSION,
  EMPTY_MEDIA_STATE,
  EMPTY_PLAYBACK_QUEUE,
  type AudioSessionState,
  type BpmAnalysisResult,
  type BackgroundEvent,
  type ExtensionResponse,
  type ExtensionState,
  type MediaCommand,
  type MediaState,
  type OffscreenRequest,
  type PlaybackMode,
  type PlaybackQueueState,
  type PlaybackTrack,
  type SidePanelRequest,
} from '../shared/protocol';

const AUDIO_SESSION_KEY = 'audioSession';
const AUDIO_QUALITY_KEY = 'audioQualityFormantStrength';
const PLAYBACK_QUEUE_KEY = 'playbackQueue';
const OFFSCREEN_PATH = 'offscreen.html';

interface PlaybackQueueSession extends PlaybackQueueState {
  tracks: PlaybackTrack[];
}

const EMPTY_PLAYBACK_QUEUE_SESSION: PlaybackQueueSession = {
  ...EMPTY_PLAYBACK_QUEUE,
  tracks: [],
};

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  void readFormantStrength(EMPTY_AUDIO_SESSION.formantStrength).then((formantStrength) =>
    writeAudioSession({ ...EMPTY_AUDIO_SESSION, formantStrength }),
  );
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

chrome.action.onClicked.addListener((tab) => {
  void handleActionClick(tab);
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isRoutedMessage(message) || message.target !== 'background') {
    return false;
  }

  void handleBackgroundMessage(message, sender)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse({
        ok: false,
        error: toErrorMessage(error),
      } satisfies ExtensionResponse);
    });

  return true;
});

async function handleBackgroundMessage(
  message: SidePanelRequest | BackgroundEvent,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  if (message.type === 'OFFSCREEN_STATE') {
    const current = await readAudioSession();
    await writeAudioSession({ ...current, ...message.state });
    return { ok: true };
  }

  if (message.type === 'TAB_TRANSCRIPTION_RECORDING_READY') {
    return runMediaCommandOnTab(message.tabId, { kind: 'SET_PLAYBACK', paused: false });
  }

  if (message.type === 'MEDIA_ENDED') {
    return handleMediaEnded(sender.tab?.id);
  }

  switch (message.type) {
    case 'GET_EXTENSION_STATE':
      return {
        ok: true,
        data: await getExtensionState(),
      } satisfies ExtensionResponse<ExtensionState>;
    case 'START_AUDIO':
      return startAudio();
    case 'STOP_AUDIO':
      return stopAudio();
    case 'ANALYZE_BPM':
      return analyzeBpm(message.sampleSeconds);
    case 'SET_PITCH':
      return setPitch(message.semitones, message.cents);
    case 'SET_AUDIO_QUALITY':
      return setAudioQuality(message.formantStrength);
    case 'TRANSCRIBE_TAB_AUDIO':
      return transcribeTabAudio(
        message.apiKey,
        message.songContext,
        message.durationSeconds,
        message.qaDryRun,
      );
    case 'CANCEL_TAB_TRANSCRIPTION':
      return cancelTabTranscription();
    case 'MEDIA_COMMAND':
      return runMediaCommand(message.command);
    case 'PLAY_PLAYLIST_TRACK':
      return playPlaylistTrack(message.playlistId, message.trackId, message.mode);
    case 'PLAY_RECENT_TRACK':
      return playRecentTrack(message.track);
    case 'SET_PLAYBACK_MODE':
      return setPlaybackMode(message.mode);
    case 'SKIP_PLAYLIST_TRACK':
      return skipPlaylistTrack(message.direction);
    case 'SET_VOCAL_REDUCTION':
      return setVocalReduction(message.strength);
    case 'SET_VOCAL_MIX':
      return setVocalMix(message.musicVolume, message.vocalVolume);
    case 'SET_EQUALIZER':
      return setEqualizer(message.low, message.mid, message.high);
    case 'SET_VARISPEED':
      return setVarispeed(message.enabled);
    case 'OPEN_MEDIA_TAB':
      return openMediaTab();
  }
}

async function getExtensionState(): Promise<ExtensionState> {
  const [audio, tab, queueSession] = await Promise.all([
    readAudioSession(),
    getActiveTab(),
    readPlaybackQueue(),
  ]);
  let media = EMPTY_MEDIA_STATE;
  let mediaError: string | null = null;

  if (tab?.id === undefined) {
    mediaError = '找不到目前的 Chrome 分頁';
  } else if (!isSupportedUrl(tab.url)) {
    mediaError = '這個 Chrome 頁面不允許擴充功能偵測媒體';
  } else {
    try {
      media = await getMediaState(tab.id);
    } catch (error) {
      mediaError = describeMediaDetectionError(error);
    }
  }

  return { audio, media, mediaError, queue: toPlaybackQueueState(queueSession) };
}

async function startAudio(targetTab?: { id: number; url: string }): Promise<ExtensionResponse<AudioSessionState>> {
  const tab = targetTab ?? (await requireActiveTab());
  const currentSession = await readAudioSession();
  const formantStrength = await readFormantStrength(currentSession.formantStrength);

  if (currentSession.status === 'active' && currentSession.tabId === tab.id) {
    return { ok: true, data: currentSession };
  }

  if (currentSession.status === 'active' && currentSession.tabId !== tab.id) {
    await stopAudio();
  }

  await ensureMediaController(tab.id);
  await ensureOffscreenDocument();

  const startingState: AudioSessionState = {
    ...(await readAudioSession()),
    status: 'starting',
    tabId: tab.id,
    error: null,
    underrunCount: 0,
    formantStrength,
  };
  await writeAudioSession(startingState);

  try {
    const streamId = await getMediaStreamId(tab.id);
    const request: OffscreenRequest = {
      target: 'offscreen',
      type: 'START_CAPTURE',
      streamId,
      tabId: tab.id,
      pitchSemitones: startingState.pitchSemitones,
      pitchCents: startingState.pitchCents,
      formantStrength: startingState.formantStrength,
    };
    const response = await chrome.runtime.sendMessage<OffscreenRequest, ExtensionResponse>(request);

    if (!response.ok) {
      throw new Error(response.error ?? '音訊引擎無法啟動');
    }

    const activeState = { ...startingState, status: 'active' as const };
    await writeAudioSession(activeState);
    return { ok: true, data: activeState };
  } catch (error) {
    if (await hasOffscreenDocument()) {
      await chrome.offscreen.closeDocument().catch(() => undefined);
    }
    const failedState: AudioSessionState = {
      ...startingState,
      status: 'error',
      error: toErrorMessage(error),
    };
    await writeAudioSession(failedState);
    return { ok: false, data: failedState, error: failedState.error ?? undefined };
  }
}

async function stopAudio(): Promise<ExtensionResponse<AudioSessionState>> {
  const request: OffscreenRequest = { target: 'offscreen', type: 'STOP_CAPTURE' };

  if (await hasOffscreenDocument()) {
    await chrome.runtime.sendMessage<OffscreenRequest, ExtensionResponse>(request).catch(() => undefined);
    await chrome.offscreen.closeDocument().catch(() => undefined);
  }

  const current = await readAudioSession();
  const idleState: AudioSessionState = {
    ...EMPTY_AUDIO_SESSION,
    pitchSemitones: current.pitchSemitones,
    pitchCents: current.pitchCents,
    formantStrength: current.formantStrength,
  };
  await writeAudioSession(idleState);
  return { ok: true, data: idleState };
}

async function setPitch(semitones: number, cents: number): Promise<ExtensionResponse<AudioSessionState>> {
  const normalized = Math.round(clamp(semitones, MIN_SEMITONES, MAX_SEMITONES));
  const normalizedCents = Math.round(clamp(cents, -100, 100));
  const current = await readAudioSession();
  const next = { ...current, pitchSemitones: normalized, pitchCents: normalizedCents };
  await writeAudioSession(next);

  if (current.status === 'active' && (await hasOffscreenDocument())) {
    const request: OffscreenRequest = {
      target: 'offscreen',
      type: 'SET_PITCH',
      semitones: normalized,
      cents: normalizedCents,
    };
    const response = await chrome.runtime.sendMessage<OffscreenRequest, ExtensionResponse>(request);
    if (!response.ok) {
      return { ok: false, data: next, error: response.error };
    }
  }

  return { ok: true, data: next };
}

async function setAudioQuality(formantStrength: number): Promise<ExtensionResponse<AudioSessionState>> {
  const normalized = clamp(formantStrength, 0, 1);
  await chrome.storage.local.set({ [AUDIO_QUALITY_KEY]: normalized });

  const current = await readAudioSession();
  const next = { ...current, formantStrength: normalized };
  await writeAudioSession(next);

  if (current.status === 'active' && (await hasOffscreenDocument())) {
    const request: OffscreenRequest = {
      target: 'offscreen',
      type: 'SET_FORMANT_STRENGTH',
      formantStrength: normalized,
    };
    const response = await chrome.runtime.sendMessage<OffscreenRequest, ExtensionResponse>(request);
    if (!response.ok) {
      return { ok: false, data: next, error: response.error };
    }
  }

  return { ok: true, data: next };
}

async function setVocalReduction(strength: number): Promise<ExtensionResponse<AudioSessionState>> {
  const normalized = Math.max(0, Math.min(1, strength));
  const current = await readAudioSession();
  const next = { ...current, vocalReduction: normalized };
  await writeAudioSession(next);

  if (current.status === 'active' && (await hasOffscreenDocument())) {
    const request: OffscreenRequest = {
      target: 'offscreen',
      type: 'SET_VOCAL_REDUCTION',
      strength: normalized,
    };
    await chrome.runtime.sendMessage<OffscreenRequest, ExtensionResponse>(request);
  }

  return { ok: true, data: next };
}

async function setVocalMix(musicVolume: number, vocalVolume: number): Promise<ExtensionResponse<AudioSessionState>> {
  const normalizedMusic = Math.max(0, Math.min(2, musicVolume));
  const normalizedVocal = Math.max(0, Math.min(2, vocalVolume));
  const current = await readAudioSession();
  const next = { ...current, vocalMix: { musicVolume: normalizedMusic, vocalVolume: normalizedVocal } };
  await writeAudioSession(next);

  if (current.status === 'active' && (await hasOffscreenDocument())) {
    const request: OffscreenRequest = {
      target: 'offscreen',
      type: 'SET_VOCAL_MIX',
      musicVolume: normalizedMusic,
      vocalVolume: normalizedVocal,
    };
    await chrome.runtime.sendMessage<OffscreenRequest, ExtensionResponse>(request);
  }

  return { ok: true, data: next };
}

async function setEqualizer(low: number, mid: number, high: number): Promise<ExtensionResponse<AudioSessionState>> {
  const normalized = {
    low: Math.max(-12, Math.min(12, low)),
    mid: Math.max(-12, Math.min(12, mid)),
    high: Math.max(-12, Math.min(12, high)),
  };
  const current = await readAudioSession();
  const next = { ...current, equalizer: normalized };
  await writeAudioSession(next);

  if (current.status === 'active' && (await hasOffscreenDocument())) {
    const request: OffscreenRequest = {
      target: 'offscreen',
      type: 'SET_EQUALIZER',
      ...normalized,
    };
    await chrome.runtime.sendMessage<OffscreenRequest, ExtensionResponse>(request);
  }

  return { ok: true, data: next };
}

async function setVarispeed(enabled: boolean): Promise<ExtensionResponse<AudioSessionState>> {
  const current = await readAudioSession();
  const next = { ...current, varispeed: enabled };
  await writeAudioSession(next);

  if (current.status === 'active' && (await hasOffscreenDocument())) {
    const request: OffscreenRequest = {
      target: 'offscreen',
      type: 'SET_VARISPEED',
      enabled,
    };
    await chrome.runtime.sendMessage<OffscreenRequest, ExtensionResponse>(request);
  }

  return { ok: true, data: next };
}

async function analyzeBpm(
  sampleSeconds = 8,
): Promise<ExtensionResponse<BpmAnalysisResult>> {
  const current = await readAudioSession();
  if (current.status !== 'active') {
    return { ok: false, error: '請先開始音訊處理，再進行 BPM 自動偵測' };
  }
  if (!(await hasOffscreenDocument())) {
    return { ok: false, error: '音訊引擎尚未準備完成，請稍候再試' };
  }

  const request: OffscreenRequest = {
    target: 'offscreen',
    type: 'ANALYZE_BPM',
    sampleSeconds: Math.max(4, Math.min(12, sampleSeconds)),
  };
  return chrome.runtime.sendMessage<OffscreenRequest, ExtensionResponse<BpmAnalysisResult>>(request);
}

async function getTabStreamingFormats(tabId: number): Promise<YouTubeAdaptiveFormat[] | null> {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        try {
          const player = document.querySelector('#movie_player') as unknown as {
            getStreamingData?: () => {
              adaptiveFormats?: YouTubeAdaptiveFormat[];
              formats?: YouTubeAdaptiveFormat[];
            };
          };
          const streamingData =
            player?.getStreamingData?.() ||
            (window as unknown as { ytInitialPlayerResponse?: { streamingData?: { adaptiveFormats?: YouTubeAdaptiveFormat[]; formats?: YouTubeAdaptiveFormat[] } } }).ytInitialPlayerResponse?.streamingData ||
            (document.querySelector('ytd-app') as unknown as { data?: { playerResponse?: { streamingData?: { adaptiveFormats?: YouTubeAdaptiveFormat[]; formats?: YouTubeAdaptiveFormat[] } } } })?.data?.playerResponse?.streamingData;

          const adaptive = streamingData?.adaptiveFormats;
          const formats = streamingData?.formats;
          return [...(adaptive || []), ...(formats || [])];
        } catch {
          return null;
        }
      },
    });
    const raw = results?.[0]?.result;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw as YouTubeAdaptiveFormat[];
    }
  } catch {
    // Script execution may fail on restricted tabs; fall through to network fetch
  }
  return null;
}

async function transcribeTabAudio(
  apiKey: string,
  songContext: string,
  _requestedDurationSeconds: number,
  qaDryRun = false,
): Promise<ExtensionResponse<import('../shared/lyrics').GroqTranscription>> {
  if (qaDryRun) {
    return {
      ok: true,
      data: {
        text: `qa-capture-${Date.now()}`,
        segments: [{ start: 0, end: 2, text: 'QA capture' }],
        words: [{ start: 0, end: 2, word: 'QA capture' }],
      },
    };
  }

  const [audio, tab] = await Promise.all([readAudioSession(), getActiveTab()]);
  const activeUrl = tab?.url ?? '';
  const videoId = extractYouTubeVideoId(activeUrl);

  if (videoId) {
    let audioBlob: { blob: Blob; fileName: string; mimeType: string } | null = null;

    // Strategy 1: Fast direct extraction from the active YouTube player in the tab (100% 403-proof, 0s latency)
    if (tab?.id) {
      try {
        const inTabFormats = await getTabStreamingFormats(tab.id);
        if (inTabFormats && inTabFormats.length > 0) {
          const optimal = selectOptimalAudioFormat(inTabFormats);
          if (optimal && optimal.url) {
            audioBlob = await downloadAudioFormatBlob(optimal, videoId);
          }
        }
      } catch {
        // Fall through to Strategy 2
      }
    }

    // Strategy 2: SmartTube multi-client InnerTube API fetch (ANDROID_VR, TVHTML5, IOS, WEB_EMBEDDED)
    if (!audioBlob) {
      try {
        audioBlob = await fetchYouTubeAudioBlob(videoId);
      } catch (streamError) {
        const msg = streamError instanceof Error ? streamError.message : '音訊串流擷取失敗';
        return { ok: false, error: `YouTube 音訊解析失敗：${msg}` };
      }
    }

    try {
      const transcription = await requestGroqTranscription({
        apiKey,
        file: audioBlob.blob,
        fileName: audioBlob.fileName,
        songContext,
      });
      return { ok: true, data: transcription };
    } catch (apiError) {
      const msg = apiError instanceof Error ? apiError.message : 'Groq 轉錄失敗';
      return { ok: false, error: `Groq AI 解析失敗：${msg}` };
    }
  }

  if (audio.status !== 'active' || audio.tabId === null || !(await hasOffscreenDocument())) {
    return {
      ok: false,
      error: '請回到要練唱的 YouTube／YouTube Music 歌曲分頁再點擊 AI 解析',
    };
  }

  const request: OffscreenRequest = {
    target: 'offscreen',
    type: 'TRANSCRIBE_CAPTURE',
    apiKey,
    songContext,
    durationSeconds: 2,
    qaDryRun,
  };
  return chrome.runtime.sendMessage<
    OffscreenRequest,
    ExtensionResponse<import('../shared/lyrics').GroqTranscription>
  >(request);
}

async function cancelTabTranscription(): Promise<ExtensionResponse> {
  if (!(await hasOffscreenDocument())) return { ok: true };
  const request: OffscreenRequest = { target: 'offscreen', type: 'CANCEL_TRANSCRIPTION' };
  return chrome.runtime.sendMessage<OffscreenRequest, ExtensionResponse>(request);
}

async function playPlaylistTrack(
  playlistId: string,
  trackId: string,
  mode: PlaybackMode,
): Promise<ExtensionResponse<PlaybackQueueState>> {
  const library = await readPlaylistLibrary();
  const playlist = library.playlists.find((item) => item.id === playlistId);
  if (!playlist) {
    return { ok: false, error: '找不到這個歌單' };
  }

  const index = playlist.tracks.findIndex((track) => track.id === trackId);
  if (index < 0) {
    return { ok: false, error: '找不到這首歌' };
  }

  const audio = await readAudioSession();
  const activeTab = audio.tabId === null ? await requireActiveTab() : null;
  const tabId = audio.tabId ?? activeTab?.id;
  if (tabId === undefined) {
    return { ok: false, error: '找不到目前的練唱分頁' };
  }

  const session: PlaybackQueueSession = {
    status: 'loading',
    tabId,
    playlistId,
    currentTrackId: trackId,
    index,
    total: playlist.tracks.length,
    mode,
    error: null,
    tracks: playlist.tracks,
  };
  await writePlaybackQueue(session);
  return playQueueIndex(session, index, tabId);
}

async function playRecentTrack(
  track: PlaybackTrack,
): Promise<ExtensionResponse<PlaybackQueueState>> {
  const audio = await readAudioSession();
  const activeTab = audio.tabId === null ? await requireActiveTab() : null;
  const tabId = audio.tabId ?? activeTab?.id;
  if (tabId === undefined) {
    return { ok: false, error: '找不到目前的練唱分頁' };
  }

  const session: PlaybackQueueSession = {
    status: 'loading',
    tabId,
    playlistId: null,
    currentTrackId: track.id,
    index: 0,
    total: 1,
    mode: 'sequential',
    error: null,
    tracks: [track],
  };
  await writePlaybackQueue(session);
  return playQueueIndex(session, 0, tabId);
}

async function setPlaybackMode(
  mode: PlaybackMode,
): Promise<ExtensionResponse<PlaybackQueueState>> {
  const current = await readPlaybackQueue();
  const next = { ...current, mode };
  await writePlaybackQueue(next);
  if (next.tabId !== null && next.status === 'playing') {
    await runMediaCommandOnTab(next.tabId, {
      kind: 'SET_TRACK_REPEAT',
      enabled: mode === 'repeat-one',
    }).catch(() => undefined);
  }
  return { ok: true, data: toPlaybackQueueState(next) };
}

async function skipPlaylistTrack(
  direction: 'previous' | 'next',
): Promise<ExtensionResponse<PlaybackQueueState>> {
  const current = await readPlaybackQueue();
  if (current.tabId === null || current.tracks.length === 0) {
    return { ok: false, data: toPlaybackQueueState(current), error: '目前沒有正在播放的歌單' };
  }

  const targetIndex = current.index + (direction === 'next' ? 1 : -1);
  if (targetIndex < 0 || targetIndex >= current.tracks.length) {
    return { ok: false, data: toPlaybackQueueState(current), error: direction === 'next' ? '已經是最後一首' : '已經是第一首' };
  }
  return playQueueIndex(current, targetIndex, current.tabId);
}

async function handleMediaEnded(tabId: number | undefined): Promise<ExtensionResponse<PlaybackQueueState>> {
  const current = await readPlaybackQueue();
  if (tabId === undefined || current.tabId !== tabId || current.status !== 'playing') {
    return { ok: true, data: toPlaybackQueueState(current) };
  }

  if (current.mode === 'repeat-one') {
    await runMediaCommandOnTab(tabId, { kind: 'SET_TRACK_REPEAT', enabled: true }).catch(
      () => undefined,
    );
    return { ok: true, data: toPlaybackQueueState(current) };
  }

  const nextIndex = current.index + 1;
  if (nextIndex >= current.tracks.length) {
    const finished = { ...EMPTY_PLAYBACK_QUEUE_SESSION, mode: current.mode };
    await writePlaybackQueue(finished);
    return { ok: true, data: toPlaybackQueueState(finished) };
  }
  return playQueueIndex(current, nextIndex, tabId);
}

async function playQueueIndex(
  current: PlaybackQueueSession,
  index: number,
  tabId: number,
): Promise<ExtensionResponse<PlaybackQueueState>> {
  const track = current.tracks[index];
  const trackId = track?.id;
  if (!track || !trackId) {
    const failed = { ...current, status: 'error' as const, error: '歌單內容已變更，找不到下一首歌' };
    await writePlaybackQueue(failed);
    return { ok: false, data: toPlaybackQueueState(failed), error: failed.error };
  }

  const loading: PlaybackQueueSession = {
    ...current,
    status: 'loading',
    tabId,
    currentTrackId: trackId,
    index,
    total: current.tracks.length,
    error: null,
  };
  await writePlaybackQueue(loading);

  try {
    const tab = await chrome.tabs.get(tabId);
    if (normalizeTrackUrl(tab.url ?? '') !== normalizeTrackUrl(track.url)) {
      await chrome.tabs.update(tabId, { url: normalizeTrackUrl(track.url), active: true });
      await waitForMedia(tabId);
    } else {
      await chrome.tabs.update(tabId, { active: true });
      await ensureMediaController(tabId);
    }

    const pitchResponse = await setPitch(track.practice.pitchSemitones, track.practice.pitchCents);
    if (!pitchResponse.ok) {
      throw new Error(pitchResponse.error ?? '無法套用歌曲 Key');
    }
    const mediaResponse = await runMediaCommandOnTab(tabId, toPracticeCommand(track, loading.mode));
    if (!mediaResponse.ok) {
      throw new Error(mediaResponse.error ?? '無法套用歌曲練習設定');
    }

    const playing = { ...loading, status: 'playing' as const };
    await writePlaybackQueue(playing);
    return { ok: true, data: toPlaybackQueueState(playing) };
  } catch (error) {
    const failed = {
      ...loading,
      status: 'error' as const,
      error: toErrorMessage(error),
    };
    await writePlaybackQueue(failed);
    return { ok: false, data: toPlaybackQueueState(failed), error: failed.error };
  }
}

function toPracticeCommand(track: PlaybackTrack, mode: PlaybackMode): MediaCommand {
  return {
    kind: 'APPLY_PRACTICE_PRESET',
    speed: track.practice.speed,
    loopStart: track.practice.loopStart,
    loopEnd: track.practice.loopEnd,
    loopEnabled: track.practice.loopEnabled ?? false,
    repeatTrack: mode === 'repeat-one',
    autoplay: true,
  };
}

async function waitForMedia(tabId: number): Promise<MediaState> {
  for (let attempt = 0; attempt < 48; attempt += 1) {
    await delay(250);
    try {
      const media = await getMediaState(tabId);
      if (media.available) {
        return media;
      }
    } catch {
      // The next page or its media element is still loading.
    }
  }
  throw new Error('切換歌曲逾時，請確認網站仍可播放這首歌');
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runMediaCommand(command: MediaCommand): Promise<ExtensionResponse<MediaState>> {
  const tab = await requireActiveTab();
  return runMediaCommandOnTab(tab.id, command);
}

async function runMediaCommandOnTab(
  tabId: number,
  command: MediaCommand,
): Promise<ExtensionResponse<MediaState>> {
  await ensureMediaController(tabId);
  return chrome.tabs.sendMessage<MediaCommand, ExtensionResponse<MediaState>>(tabId, command);
}

async function openMediaTab(): Promise<ExtensionResponse> {
  const session = await readAudioSession();
  const activeTab = session.tabId === null ? await getActiveTab() : undefined;
  const targetTabId = session.tabId ?? activeTab?.id;

  if (targetTabId === undefined || (activeTab && !isSupportedUrl(activeTab.url))) {
    return { ok: false, error: '目前沒有可開啟的歌曲分頁' };
  }

  await chrome.tabs.update(targetTabId, { active: true });
  return { ok: true };
}

async function getMediaState(tabId: number): Promise<MediaState> {
  await ensureMediaController(tabId);
  const response = await chrome.tabs.sendMessage<MediaCommand, ExtensionResponse<MediaState>>(tabId, {
    kind: 'GET_MEDIA_STATE',
  });

  if (!response.ok) {
    throw new Error(response.error ?? '媒體控制器沒有回應');
  }

  return response.data ?? EMPTY_MEDIA_STATE;
}

async function ensureMediaController(tabId: number): Promise<void> {
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { kind: 'PING' });
    if (ping?.ok) {
      return;
    }
  } catch {
    // The content script has not been injected in this navigation yet.
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['media-controller.js'],
  });
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.USER_MEDIA, chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: '即時處理使用者主動啟動的目前分頁音訊，並將移調後聲音播放回裝置。',
  });
}

async function hasOffscreenDocument(): Promise<boolean> {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [offscreenUrl],
  });
  return contexts.length > 0;
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function getMediaStreamId(tabId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError || !streamId) {
        reject(new Error(describeCaptureError(runtimeError?.message)));
        return;
      }
      resolve(streamId);
    });
  });
}

async function requireActiveTab(): Promise<{ id: number; url: string }> {
  const tab = await getActiveTab();
  if (tab?.id === undefined || !isSupportedUrl(tab.url)) {
    throw new Error('請先切到有音樂或影片的網頁，再開啟調唱');
  }

  return { id: tab.id, url: tab.url ?? '' };
}

function isSupportedUrl(url: string | undefined): boolean {
  // `activeTab` may intentionally hide the URL until the user invokes the
  // extension. In that case we optimistically try the scoped injection and let
  // Chrome reject protected pages, instead of requiring the broader `tabs`
  // permission merely to inspect the URL.
  return url === undefined || url.startsWith('https://') || url.startsWith('http://');
}

async function readAudioSession(): Promise<AudioSessionState> {
  const result = await chrome.storage.session.get(AUDIO_SESSION_KEY);
  return {
    ...EMPTY_AUDIO_SESSION,
    ...((result[AUDIO_SESSION_KEY] as Partial<AudioSessionState> | undefined) ?? {}),
  };
}

async function writeAudioSession(state: AudioSessionState): Promise<void> {
  await chrome.storage.session.set({ [AUDIO_SESSION_KEY]: state });
}

async function readPlaybackQueue(): Promise<PlaybackQueueSession> {
  const result = await chrome.storage.session.get(PLAYBACK_QUEUE_KEY);
  const stored = result[PLAYBACK_QUEUE_KEY] as Partial<PlaybackQueueSession> | undefined;
  return {
    ...EMPTY_PLAYBACK_QUEUE_SESSION,
    ...stored,
    tracks: Array.isArray(stored?.tracks) ? stored.tracks : [],
  };
}

async function writePlaybackQueue(state: PlaybackQueueSession): Promise<void> {
  await chrome.storage.session.set({ [PLAYBACK_QUEUE_KEY]: state });
}

function toPlaybackQueueState(session: PlaybackQueueSession): PlaybackQueueState {
  const { tracks: _tracks, ...state } = session;
  return state;
}

async function readPlaylistLibrary(): Promise<PlaylistLibrary> {
  const result = await chrome.storage.local.get(PLAYLIST_LIBRARY_STORAGE_KEY);
  const library = result[PLAYLIST_LIBRARY_STORAGE_KEY] as PlaylistLibrary | undefined;
  return library?.schemaVersion === 1 && Array.isArray(library.playlists)
    ? library
    : EMPTY_PLAYLIST_LIBRARY;
}

async function readFormantStrength(fallback: number): Promise<number> {
  const stored = await chrome.storage.local.get(AUDIO_QUALITY_KEY);
  const value = stored[AUDIO_QUALITY_KEY];
  return typeof value === 'number' ? clamp(value, 0, 1) : fallback;
}

function isRoutedMessage(value: unknown): value is SidePanelRequest | BackgroundEvent {
  return Boolean(value && typeof value === 'object' && 'target' in value && 'type' in value);
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '發生未知錯誤';
}

async function handleActionClick(tab: chrome.tabs.Tab): Promise<void> {
  if (tab.id === undefined) {
    return;
  }

  await chrome.sidePanel.open({ tabId: tab.id });

  if (!isSupportedUrl(tab.url)) {
    return;
  }

  try {
    const media = await getMediaState(tab.id);
    if (!media.available) {
      return;
    }

    await startAudio({ id: tab.id, url: tab.url ?? '' });
  } catch (error) {
    const current = await readAudioSession();
    await writeAudioSession({
      ...current,
      status: 'error',
      tabId: tab.id,
      error: toErrorMessage(error),
    });
  }
}

function describeMediaDetectionError(error: unknown): string {
  const message = toErrorMessage(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('cannot access contents') ||
    normalized.includes('missing host permission') ||
    normalized.includes('cannot access a chrome')
  ) {
    return '無法取得這個分頁的權限。請重新載入擴充功能與 YouTube 分頁。';
  }

  if (normalized.includes('receiving end does not exist')) {
    return '無法連接 YouTube 媒體控制器。請重新整理 YouTube 分頁。';
  }

  return `媒體偵測失敗：${message}`;
}
