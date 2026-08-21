import type {
  ExtensionResponse,
  LoopState,
  LyricsOverlayPayload,
  MediaCommand,
  MediaState,
} from '../shared/protocol';
import { createLyricsOverlayController } from './lyrics-overlay';

const MIN_SPEED = 0.25;
const MAX_SPEED = 4;
const LYRICS_LIBRARY_STORAGE_KEY = 'lyricsLibraryV1';

interface StoredLyricsEntry extends LyricsOverlayPayload {
  trackUrl: string;
}

interface StoredLyricsLibrary {
  entries?: StoredLyricsEntry[];
}

function normalizeTrackUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.slice(1).split('/')[0];
      return videoId ? `https://www.youtube.com/watch?v=${videoId}` : rawUrl;
    }
    if (url.hostname.endsWith('youtube.com')) {
      const videoId = url.searchParams.get('v');
      return videoId ? `https://www.youtube.com/watch?v=${videoId}` : rawUrl;
    }
    url.hash = '';
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function findStoredLyrics(
  library: StoredLyricsLibrary | undefined,
  trackUrl: string,
): StoredLyricsEntry | null {
  const key = normalizeTrackUrl(trackUrl);
  return library?.entries?.find((entry) => normalizeTrackUrl(entry.trackUrl) === key) ?? null;
}
const EMPTY_MEDIA_STATE: MediaState = {
  available: false,
  title: '尚未找到媒體',
  artist: '請先開啟 YouTube 或網頁音樂',
  platform: '網頁媒體',
  url: '',
  duration: 0,
  currentTime: 0,
  paused: true,
  playbackRate: 1,
  loop: { start: null, end: null, enabled: false },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

declare global {
  interface Window {
    __diaochangMediaControllerInstalled?: boolean;
  }
}

function isExtensionValid(): boolean {
  try {
    return Boolean(
      typeof chrome !== 'undefined' &&
        chrome?.runtime &&
        chrome.runtime.id &&
        chrome?.storage?.local
    );
  } catch {
    return false;
  }
}

if (!window.__diaochangMediaControllerInstalled) {
  window.__diaochangMediaControllerInstalled = true;
  installMediaController();
}

function installMediaController(): void {
  let selectedMedia: HTMLMediaElement | null = null;
  let observedMedia: HTMLMediaElement | null = null;
  let loopState: LoopState = { start: null, end: null, enabled: false };
  let trackRepeat = false;
  let loopFrame = 0;
  let isTornDown = false;

  const handleOverlaySettingsChange = (patch: Partial<LyricsOverlayPayload>) => {
    if (!isExtensionValid()) {
      teardown();
      return;
    }
    try {
      chrome.storage?.local?.get(LYRICS_LIBRARY_STORAGE_KEY)?.then((stored) => {
        if (!isExtensionValid()) return;
        const library = stored?.[LYRICS_LIBRARY_STORAGE_KEY] as StoredLyricsLibrary | undefined;
        const key = normalizeTrackUrl(location.href);
        if (!library?.entries) return;
        const nextEntries = library.entries.map((entry) => {
          if (normalizeTrackUrl(entry.trackUrl) === key) {
            return { ...entry, ...patch, updatedAt: Date.now() };
          }
          return entry;
        });
        void chrome.storage?.local?.set({
          [LYRICS_LIBRARY_STORAGE_KEY]: {
            ...library,
            updatedAt: Date.now(),
            entries: nextEntries,
          },
        })?.catch(() => undefined);
      })?.catch(() => {
        if (!isExtensionValid()) teardown();
      });
    } catch {
      teardown();
    }
  };

  const lyricsOverlay = createLyricsOverlayController({
    onSettingsChange: handleOverlaySettingsChange,
  });

  function teardown(): void {
    if (isTornDown) {
      return;
    }
    isTornDown = true;
    if (loopFrame) {
      cancelAnimationFrame(loopFrame);
      loopFrame = 0;
    }
    observedMedia?.removeEventListener('ended', handleMediaEnded);
    try {
      lyricsOverlay.destroy();
    } catch {}
    try {
      if (chrome?.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(handleLyricsStorageChange);
      }
    } catch {}
    window.removeEventListener('yt-navigate-finish', syncStoredLyrics);
    window.removeEventListener('pagehide', teardown);
  }

  const syncStoredLyrics = () => {
    if (!isExtensionValid()) {
      teardown();
      return;
    }
    try {
      chrome.storage?.local?.get(LYRICS_LIBRARY_STORAGE_KEY)
        ?.then((stored) => {
          if (!isExtensionValid()) {
            teardown();
            return;
          }
          const library = stored?.[LYRICS_LIBRARY_STORAGE_KEY] as StoredLyricsLibrary | undefined;
          const entry = findStoredLyrics(library, location.href);
          lyricsOverlay.setLyrics(entry ? {
            title: entry.title,
            visible: entry.visible,
            offsetMs: entry.offsetMs,
            fontScale: entry.fontScale ?? 1,
            panelOpacity: entry.panelOpacity ?? 0.88,
            verticalOffset: entry.verticalOffset ?? 0,
            leadTimeSeconds: entry.leadTimeSeconds ?? 1.5,
            layoutMode: entry.layoutMode ?? 'dock-bottom',
            dockHeightPercent: entry.dockHeightPercent ?? 30,
            lines: entry.lines,
          } : null);
        })
        ?.catch(() => {
          teardown();
        });
    } catch {
      teardown();
    }
  };

  const handleLyricsStorageChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (!isExtensionValid()) {
      teardown();
      return;
    }
    if (areaName === 'local' && changes?.[LYRICS_LIBRARY_STORAGE_KEY]) {
      syncStoredLyrics();
    }
  };

  syncStoredLyrics();
  try {
    if (isExtensionValid() && chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleLyricsStorageChange);
    }
  } catch {
    teardown();
  }
  window.addEventListener('yt-navigate-finish', syncStoredLyrics);

  try {
    if (isExtensionValid() && chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
        if (!isExtensionValid()) {
          teardown();
          return false;
        }

        if (isPing(message)) {
          sendResponse({ ok: true });
          return false;
        }

        if (!isMediaCommand(message)) {
          return false;
        }

        void handleCommand(message)
          .then(sendResponse)
          .catch((error: unknown) => {
            sendResponse({
              ok: false,
              error: error instanceof Error ? error.message : '媒體控制失敗',
            } satisfies ExtensionResponse);
          });
        return true;
      });
    }
  } catch {
    teardown();
  }

  window.addEventListener('pagehide', teardown, { once: true });
  scheduleLoopCheck();

  async function handleCommand(command: MediaCommand): Promise<ExtensionResponse<MediaState>> {
    const media = getMedia();

    if (command.kind === 'GET_MEDIA_STATE') {
      return { ok: true, data: createMediaState(media) };
    }

    if (command.kind === 'SET_LYRICS_OVERLAY') {
      lyricsOverlay.setLyrics(command.lyrics);
      lyricsOverlay.update(media?.currentTime ?? 0, media);
      return { ok: true, data: createMediaState(media) };
    }

    if (!media) {
      return { ok: false, data: EMPTY_MEDIA_STATE, error: '這個頁面目前沒有可控制的音樂或影片' };
    }

    switch (command.kind) {
      case 'SET_SPEED':
        media.preservesPitch = true;
        media.playbackRate = clamp(command.speed, MIN_SPEED, MAX_SPEED);
        break;
      case 'SET_LOOP_POINT':
        loopState = {
          ...loopState,
          [command.point]: media.currentTime,
          enabled: false,
        };
        normalizeLoop();
        break;
      case 'TOGGLE_LOOP':
        if (loopState.start === null || loopState.end === null) {
          throw new Error('請先設定 A 點與 B 點');
        }
        loopState = { ...loopState, enabled: !loopState.enabled };
        break;
      case 'CLEAR_LOOP':
        loopState = { start: null, end: null, enabled: false };
        break;
      case 'TOGGLE_PLAYBACK':
        if (media.paused) {
          await media.play();
        } else {
          media.pause();
        }
        break;
      case 'SEEK_RELATIVE':
        media.currentTime = clamp(media.currentTime + command.seconds, 0, media.duration || Infinity);
        break;
      case 'SEEK_ABSOLUTE':
        media.currentTime = clamp(command.seconds, 0, media.duration || Infinity);
        break;
      case 'SET_PLAYBACK':
        if (command.paused) {
          media.pause();
        } else {
          await media.play();
        }
        break;
      case 'APPLY_PRACTICE_PRESET': {
        media.preservesPitch = true;
        media.playbackRate = clamp(command.speed, MIN_SPEED, MAX_SPEED);
        trackRepeat = command.repeatTrack;
        loopState = {
          start: command.loopStart,
          end: command.loopEnd,
          enabled: command.loopEnabled,
        };
        normalizeLoop();
        const startAt = loopState.enabled && loopState.start !== null ? loopState.start : 0;
        media.currentTime = clamp(startAt, 0, media.duration || Infinity);
        if (command.autoplay) {
          await media.play().catch(() => undefined);
        }
        break;
      }
      case 'SET_TRACK_REPEAT':
        trackRepeat = command.enabled;
        break;
      case 'SET_LOOP_CLIP':
        loopState = {
          start: command.clip.start,
          end: command.clip.end,
          enabled: true,
          activeClipId: command.clip.id,
          clips: loopState.clips,
        };
        media.currentTime = command.clip.start;
        if (command.clip.speed) {
          media.playbackRate = clamp(command.clip.speed, MIN_SPEED, MAX_SPEED);
        }
        break;
      case 'SAVE_CURRENT_CLIP': {
        const start = loopState.start ?? 0;
        const end = loopState.end ?? (media.duration || 10);
        const newClip = {
          id: `clip-${Date.now()}`,
          name: command.name || `片段 ${(loopState.clips?.length ?? 0) + 1}`,
          start: Math.min(start, end),
          end: Math.max(start, end),
          speed: media.playbackRate,
        };
        const existing = loopState.clips ?? [];
        loopState = {
          ...loopState,
          activeClipId: newClip.id,
          clips: [...existing, newClip],
        };
        break;
      }
      case 'DELETE_LOOP_CLIP': {
        const nextClips = (loopState.clips ?? []).filter((c) => c.id !== command.clipId);
        loopState = {
          ...loopState,
          activeClipId: loopState.activeClipId === command.clipId ? null : loopState.activeClipId,
          clips: nextClips,
        };
        break;
      }
    }

    return { ok: true, data: createMediaState(media) };
  }

  function getMedia(): HTMLMediaElement | null {
    const candidates = [...document.querySelectorAll<HTMLMediaElement>('video, audio')].filter(
      (element) => element.readyState > HTMLMediaElement.HAVE_NOTHING || element.currentSrc,
    );

    if (selectedMedia && document.contains(selectedMedia) && candidates.includes(selectedMedia)) {
      observeMedia(selectedMedia);
      return selectedMedia;
    }

    selectedMedia = selectBestMedia(candidates);
    loopState = { start: null, end: null, enabled: false };
    trackRepeat = false;
    observeMedia(selectedMedia);
    return selectedMedia;
  }

  function observeMedia(media: HTMLMediaElement | null): void {
    if (observedMedia === media) {
      return;
    }
    observedMedia?.removeEventListener('ended', handleMediaEnded);
    observedMedia = media;
    observedMedia?.addEventListener('ended', handleMediaEnded);
  }

  function handleMediaEnded(): void {
    if (!observedMedia) {
      return;
    }
    if (trackRepeat) {
      observedMedia.currentTime = 0;
      void observedMedia.play().catch(() => undefined);
      return;
    }
    if (!isExtensionValid()) {
      teardown();
      return;
    }
    try {
      void chrome.runtime.sendMessage({ target: 'background', type: 'MEDIA_ENDED' }).catch(() => {
        teardown();
      });
    } catch {
      teardown();
    }
  }

  function createMediaState(media: HTMLMediaElement | null): MediaState {
    if (!media) {
      return EMPTY_MEDIA_STATE;
    }

    return {
      available: true,
      title: getTitle(),
      artist: getArtist(),
      platform: getPlatform(),
      url: location.href,
      duration: Number.isFinite(media.duration) ? media.duration : 0,
      currentTime: media.currentTime,
      paused: media.paused,
      playbackRate: media.playbackRate,
      loop: loopState,
    };
  }

  function normalizeLoop(): void {
    const { start, end } = loopState;
    if (start === null || end === null) {
      return;
    }

    const normalizedStart = Math.min(start, end);
    const normalizedEnd = Math.max(start, end);
    loopState = {
      start: normalizedStart,
      end: normalizedEnd,
      enabled: normalizedEnd - normalizedStart >= 0.5 ? loopState.enabled : false,
    };
  }

  function scheduleLoopCheck(): void {
    if (isTornDown || !isExtensionValid()) {
      teardown();
      return;
    }
    loopFrame = requestAnimationFrame(() => {
      if (isTornDown || !isExtensionValid()) {
        teardown();
        return;
      }
      try {
        const media = getMedia();
        lyricsOverlay.update(media?.currentTime ?? 0, media);
        if (
          media &&
          loopState.enabled &&
          loopState.start !== null &&
          loopState.end !== null &&
          media.currentTime >= loopState.end
        ) {
          media.currentTime = loopState.start;
          if (media.paused) {
            void media.play().catch(() => undefined);
          }
        }
      } catch {
        if (!isExtensionValid()) {
          teardown();
          return;
        }
      }
      scheduleLoopCheck();
    });
  }
}

function selectBestMedia(candidates: HTMLMediaElement[]): HTMLMediaElement | null {
  if (candidates.length === 0) {
    return null;
  }

  const playing = candidates.find((media) => !media.paused && !media.ended);
  if (playing) {
    return playing;
  }

  return candidates.reduce((best, current) => {
    const bestScore = scoreMedia(best);
    const currentScore = scoreMedia(current);
    return currentScore > bestScore ? current : best;
  });
}

function scoreMedia(media: HTMLMediaElement): number {
  const rect = media.getBoundingClientRect();
  const area = Math.max(0, rect.width) * Math.max(0, rect.height);
  const duration = Number.isFinite(media.duration) ? media.duration : 0;
  return area + duration * 100;
}

function getTitle(): string {
  // YouTube
  const youtubeTitle = document.querySelector<HTMLElement>('h1.ytd-watch-metadata yt-formatted-string');
  if (youtubeTitle?.innerText.trim()) return youtubeTitle.innerText.trim();

  // Spotify
  const spotifyTitle = document.querySelector<HTMLElement>('[data-testid="context-item-info-title"] a, [data-testid="nowplaying-track-link"]');
  if (spotifyTitle?.innerText.trim()) return spotifyTitle.innerText.trim();

  // Apple Music
  const appleTitle = document.querySelector<HTMLElement>('.web-chrome-playback-lcd__song-name-scroll-inner, .lcd__song-title');
  if (appleTitle?.innerText.trim()) return appleTitle.innerText.trim();

  // SoundCloud
  const soundCloudTitle = document.querySelector<HTMLElement>('.playbackSoundBadge__titleLink');
  if (soundCloudTitle?.title || soundCloudTitle?.innerText.trim()) {
    return (soundCloudTitle.title || soundCloudTitle.innerText).trim();
  }

  // Deezer
  const deezerTitle = document.querySelector<HTMLElement>('.track-link');
  if (deezerTitle?.innerText.trim()) return deezerTitle.innerText.trim();

  // Tidal
  const tidalTitle = document.querySelector<HTMLElement>('[data-test="footer-track-title"]');
  if (tidalTitle?.innerText.trim()) return tidalTitle.innerText.trim();

  // Bilibili
  const bilibiliTitle = document.querySelector<HTMLElement>('h1.video-title');
  if (bilibiliTitle?.innerText.trim()) return bilibiliTitle.innerText.trim();

  const rawTitle = document.title;
  return rawTitle.replace(/\s+-\s+YouTube$/, '').replace(/\s+\|\s+Spotify$/, '').replace(/\s+\|\s+SoundCloud$/, '').trim() || '未命名媒體';
}

function getArtist(): string {
  // YouTube
  const youtubeSelectors = [
    '#channel-name a',
    'ytd-video-owner-renderer #text a',
    '[itemprop="author"] [itemprop="name"]',
  ];
  for (const selector of youtubeSelectors) {
    const value = document.querySelector<HTMLElement>(selector)?.innerText.trim();
    if (value) return value;
  }

  // Spotify
  const spotifyArtist = document.querySelector<HTMLElement>('[data-testid="context-item-info-subtitles"] a, [data-testid="context-item-info-artist"]');
  if (spotifyArtist?.innerText.trim()) return spotifyArtist.innerText.trim();

  // Apple Music
  const appleArtist = document.querySelector<HTMLElement>('.web-chrome-playback-lcd__sub-copy-scroll-inner-text, .lcd__sub-title');
  if (appleArtist?.innerText.trim()) return appleArtist.innerText.trim();

  // SoundCloud
  const soundCloudArtist = document.querySelector<HTMLElement>('.playbackSoundBadge__lightLink');
  if (soundCloudArtist?.title || soundCloudArtist?.innerText.trim()) {
    return (soundCloudArtist.title || soundCloudArtist.innerText).trim();
  }

  // Deezer
  const deezerArtist = document.querySelector<HTMLElement>('.artist-link');
  if (deezerArtist?.innerText.trim()) return deezerArtist.innerText.trim();

  // Tidal
  const tidalArtist = document.querySelector<HTMLElement>('[data-test="grid-item-detail-text-title-artist"]');
  if (tidalArtist?.innerText.trim()) return tidalArtist.innerText.trim();

  // Bilibili
  const bilibiliArtist = document.querySelector<HTMLElement>('.up-name, .username');
  if (bilibiliArtist?.innerText.trim()) return bilibiliArtist.innerText.trim();

  return location.hostname.replace(/^www\./, '') || '本機音訊';
}

function getPlatform(): string {
  if (location.hostname.includes('youtube.com')) return 'YouTube';
  if (location.hostname.includes('spotify.com')) return 'Spotify';
  if (location.hostname.includes('music.apple.com')) return 'Apple Music';
  if (location.hostname.includes('soundcloud.com')) return 'SoundCloud';
  if (location.hostname.includes('deezer.com')) return 'Deezer';
  if (location.hostname.includes('tidal.com')) return 'Tidal';
  if (location.hostname.includes('vimeo.com')) return 'Vimeo';
  if (location.hostname.includes('bilibili.com')) return 'Bilibili';
  if (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') return '本機檔案';
  return '網頁媒體';
}

function isPing(value: unknown): value is { kind: 'PING' } {
  return Boolean(value && typeof value === 'object' && 'kind' in value && value.kind === 'PING');
}

function isMediaCommand(value: unknown): value is MediaCommand {
  return Boolean(value && typeof value === 'object' && 'kind' in value && value.kind !== 'PING');
}
