import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';
import { resolveBrowserLaunchOptions } from './browser-launch-options.mjs';

const workspacePath = resolve(import.meta.dirname, '..');
const extensionPath = join(workspacePath, 'dist');
const soakSeconds = Number(process.env.DIAOCHANG_SOAK_SECONDS ?? 0);
const screenshotPath = process.env.DIAOCHANG_SCREENSHOT_PATH;
const browserLaunchOptions = resolveBrowserLaunchOptions();
const userDataPath = await mkdtemp(join(tmpdir(), 'diaochang-extension-'));
const qaExtensionPath = join(userDataPath, 'extension');
const errors = [];
let context;
let qaServer;
let smokeUrl = process.env.DIAOCHANG_SMOKE_URL;

try {
  if (!smokeUrl) {
    qaServer = createServer(async (request, response) => {
      const routes = {
        '/qa/media-harness.html': {
          path: join(workspacePath, 'qa/media-harness.html'),
          contentType: 'text/html; charset=utf-8',
        },
        '/qa/tone-440.wav': {
          path: join(workspacePath, 'qa/tone-440.wav'),
          contentType: 'audio/wav',
        },
      };
      const routePath = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
      const route = routes[routePath];
      if (!route) {
        response.writeHead(404).end();
        return;
      }
      const body = await readFile(route.path);
      const range = request.headers.range;
      if (range && route.contentType === 'audio/wav') {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (match) {
          const start = Number(match[1]);
          const end = match[2] ? Math.min(Number(match[2]), body.length - 1) : body.length - 1;
          const chunk = body.subarray(start, end + 1);
          response.writeHead(206, {
            'Accept-Ranges': 'bytes',
            'Content-Range': `bytes ${start}-${end}/${body.length}`,
            'Content-Length': chunk.length,
            'Content-Type': route.contentType,
          });
          response.end(chunk);
          return;
        }
      }
      response.writeHead(200, {
        'Accept-Ranges': route.contentType === 'audio/wav' ? 'bytes' : 'none',
        'Content-Length': body.length,
        'Content-Type': route.contentType,
      });
      response.end(body);
    });
    await new Promise((resolveListen) => qaServer.listen(0, '127.0.0.1', resolveListen));
    const address = qaServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to start the local QA media server');
    }
    smokeUrl = `http://127.0.0.1:${address.port}/qa/media-harness.html`;
  }

  const smokeOrigin = new URL(smokeUrl).origin;
  const isLocalSmoke = new URL(smokeUrl).hostname === '127.0.0.1';
  await cp(extensionPath, qaExtensionPath, { recursive: true });
  const qaManifestPath = join(qaExtensionPath, 'manifest.json');
  const qaManifest = JSON.parse(await readFile(qaManifestPath, 'utf8'));
  qaManifest.host_permissions = [`${smokeOrigin}/*`];
  await writeFile(qaManifestPath, `${JSON.stringify(qaManifest, null, 2)}\n`);

  const launchContext = (allowlistedExtensionId) =>
    chromium.launchPersistentContext(userDataPath, {
      ...browserLaunchOptions,
      headless: false,
      viewport: { width: 1120, height: 760 },
      args: [
        `--disable-extensions-except=${qaExtensionPath}`,
        `--load-extension=${qaExtensionPath}`,
        ...(allowlistedExtensionId
          ? [`--allowlisted-extension-id=${allowlistedExtensionId}`]
          : []),
        '--autoplay-policy=no-user-gesture-required',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

  const discoveryContext = await launchContext();
  let [discoveryWorker] = discoveryContext.serviceWorkers();
  if (!discoveryWorker) {
    discoveryWorker = await discoveryContext.waitForEvent('serviceworker', { timeout: 15_000 });
  }
  const extensionId = new URL(discoveryWorker.url()).host;
  await discoveryContext.close();

  context = await launchContext(extensionId);

  context.on('page', (page) => {
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(`console: ${message.text()}`);
      }
    });
  });

  let [worker] = context.serviceWorkers();
  if (!worker) {
    worker = await context.waitForEvent('serviceworker', { timeout: 15_000 });
  }

  const loadedExtensionId = new URL(worker.url()).host;
  if (loadedExtensionId !== extensionId) {
    throw new Error(`Extension ID changed between QA launches: ${extensionId} -> ${loadedExtensionId}`);
  }
  const mediaPage = await context.newPage();
  await mediaPage.goto(smokeUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  const mediaLocator = mediaPage.locator('video, audio').first();
  await mediaLocator.waitFor({ state: 'attached', timeout: 30_000 });
  await mediaLocator.evaluate((media) => media.play());

  const controllerPage = await context.newPage();
  await controllerPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await controllerPage.locator('.app-shell').waitFor({ state: 'visible', timeout: 15_000 });

  const publicUiSummary = await controllerPage.evaluate(() => ({
    releaseChannel: document.querySelector('.app-shell')?.getAttribute('data-release-channel'),
    practiceText: document.querySelector('.practice-view')?.textContent ?? '',
    optionalHostPermissions: chrome.runtime.getManifest().optional_host_permissions ?? [],
    oauthConfigured: Boolean(chrome.runtime.getManifest().oauth2),
  }));
  await controllerPage.locator('.app-header .header-icon-button').click();
  publicUiSummary.settingsText = await controllerPage.locator('.settings-view').innerText();
  publicUiSummary.keyRangeOptions = await controllerPage.locator('select[aria-label="Key 範圍"] option').allTextContents();
  await controllerPage.locator('.app-header--detail .header-icon-button').click();
  await controllerPage.locator('.bottom-nav button').nth(3).click();
  publicUiSummary.lyricsText = await controllerPage.locator('.lyrics-view').innerText();
  await controllerPage.locator('.bottom-nav button').nth(0).click();

  const hiddenPublicLabels = [
    'BPM 節奏與節拍器',
    '人聲消除／伴奏提取',
    '3 段等化器',
    'Google Drive 大容量同步',
    'AI 產生動態時間碼',
    'Varispeed',
  ];
  publicUiSummary.visibleExperimentalLabels = hiddenPublicLabels.filter((label) =>
    `${publicUiSummary.practiceText}\n${publicUiSummary.settingsText}\n${publicUiSummary.lyricsText}`.includes(label),
  );

  const controllerUrl = `chrome-extension://${extensionId}/sidepanel.html`;
  const sendMessage = async (message) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        if (!controllerPage.url().startsWith(`chrome-extension://${extensionId}/`)) {
          await controllerPage.goto(controllerUrl);
        }
        return await controllerPage.evaluate(
          (payload) => chrome.runtime.sendMessage(payload),
          message,
        );
      } catch (error) {
        if (attempt > 0 || !String(error).includes('Execution context was destroyed')) throw error;
        await controllerPage.waitForTimeout(150);
        await controllerPage.goto(controllerUrl);
      }
    }
    throw new Error('Unable to send extension message');
  };

  const syncCapability = await controllerPage.evaluate(async () => {
    const profile = await chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' });
    const key = 'diaochangQaSyncProbe';
    const value = { ok: true, at: Date.now() };
    await chrome.storage.sync.set({ [key]: value });
    const stored = await chrome.storage.sync.get(key);
    await chrome.storage.sync.remove(key);
    return {
      profileAvailable: Boolean(profile.email),
      roundTrip: stored[key]?.ok === true,
    };
  });

  await mediaPage.bringToFront();
  await controllerPage.waitForTimeout(800);
  const coldDetectionStateResponse = await sendMessage({
    target: 'background',
    type: 'GET_EXTENSION_STATE',
  });
  const coldStartResponse = await sendMessage({ target: 'background', type: 'START_AUDIO' });
  const coldStartCleanupResponse = coldStartResponse?.ok
    ? await sendMessage({ target: 'background', type: 'STOP_AUDIO' })
    : null;

  await controllerPage.waitForTimeout(800);
  const autoStartClick = await controllerPage.evaluate(() => {
    const button = document.querySelector('button[aria-label="升高一個半音"]');
    if (!(button instanceof HTMLButtonElement)) {
      return false;
    }
    button.click();
    return true;
  });
  await mediaPage.waitForTimeout(1_500);
  const autoStartStateResponse = await sendMessage({
    target: 'background',
    type: 'GET_EXTENSION_STATE',
  });
  const autoStartStopResponse = await sendMessage({ target: 'background', type: 'STOP_AUDIO' });

  const tabSnapshot = await controllerPage.evaluate(async () => {
    const tabs = await chrome.tabs.query({});
    return tabs.map((tab) => ({
      id: tab.id,
      active: tab.active,
      currentWindow: tab.windowId,
      url: tab.url,
      title: tab.title,
    }));
  });

  const startResponse = await sendMessage({ target: 'background', type: 'START_AUDIO' });
  await mediaPage.waitForTimeout(1_200);

  // The bundled fixture is a steady 440 Hz tone rather than a rhythmic song.
  // Exercise the real offscreen BPM request and verify the honest "unclear beat"
  // failure path instead of treating a static fixture as a fake success.
  let bpmAnalysisResponse = null;
  if (isLocalSmoke) {
    bpmAnalysisResponse = await sendMessage({
      target: 'background',
      type: 'ANALYZE_BPM',
      sampleSeconds: 4,
    });
  }

  const publicExperimentalCommandResponses = isLocalSmoke ? {
    vocalMix: await sendMessage({
      target: 'background',
      type: 'SET_VOCAL_MIX',
      musicVolume: 0.8,
      vocalVolume: 0.2,
    }),
    equalizer: await sendMessage({
      target: 'background',
      type: 'SET_EQUALIZER',
      low: 2,
      mid: -2,
      high: 1,
    }),
    varispeed: await sendMessage({
      target: 'background',
      type: 'SET_VARISPEED',
      enabled: true,
    }),
  } : null;

  const standardQualityResponse = await sendMessage({
    target: 'background',
    type: 'SET_AUDIO_QUALITY',
    formantStrength: 0,
  });
  const naturalQualityResponse = await sendMessage({
    target: 'background',
    type: 'SET_AUDIO_QUALITY',
    formantStrength: 1,
  });

  const pitchResponse = await sendMessage({
    target: 'background',
    type: 'SET_PITCH',
    semitones: 7,
    cents: 0,
  });

  const speedResponse = await sendMessage({
    target: 'background',
    type: 'MEDIA_COMMAND',
    command: { kind: 'SET_SPEED', speed: 0.75 },
  });

  const loopStartResponse = await sendMessage({
    target: 'background',
    type: 'MEDIA_COMMAND',
    command: { kind: 'SET_LOOP_POINT', point: 'start' },
  });
  await mediaPage.waitForTimeout(900);
  const loopEndResponse = await sendMessage({
    target: 'background',
    type: 'MEDIA_COMMAND',
    command: { kind: 'SET_LOOP_POINT', point: 'end' },
  });
  const loopToggleResponse = await sendMessage({
    target: 'background',
    type: 'MEDIA_COMMAND',
    command: { kind: 'TOGGLE_LOOP' },
  });
  await mediaPage.waitForTimeout(1_500);

  const stateResponse = await sendMessage({
    target: 'background',
    type: 'GET_EXTENSION_STATE',
  });

  // Keep the lyric overlay assertion deterministic after the BPM probe.
  await mediaPage.locator('audio').evaluate(async (media) => {
    media.currentTime = 1;
    await media.play();
  });
  await mediaPage.waitForTimeout(150);

  const lyricsOverlayResponse = await sendMessage({
    target: 'background',
    type: 'MEDIA_COMMAND',
    command: {
      kind: 'SET_LYRICS_OVERLAY',
      lyrics: {
        title: 'Karaoke Kaiju 歌詞測試',
        visible: true,
        offsetMs: 0,
        fontScale: 1.2,
        panelOpacity: 0.66,
        verticalOffset: 4,
        layoutMode: 'video-overlay',
        lines: [
          { id: 'qa-line-1', text: '準備唱下一句', start: 0, end: 6, words: [] },
          { id: 'qa-line-2', text: '跟著節奏練習', start: 6, end: 12, words: [] },
        ],
      },
    },
  });
  await mediaPage.waitForTimeout(250);
  const lyricsOverlayState = await mediaPage.evaluate(() => {
    const host = document.querySelector('#diaochang-karaoke-overlay');
    const lines = host?.shadowRoot?.querySelectorAll('.lyric-line') ?? [];
    return {
      mounted: Boolean(host?.isConnected),
      hidden: host instanceof HTMLElement ? host.hidden : true,
      texts: [...lines].map((line) => line.textContent?.trim()),
      activeClip: host?.shadowRoot?.querySelector('.lyric-fill')?.getAttribute('style') ?? '',
      bottom: host instanceof HTMLElement ? host.style.bottom : '',
      fontMinimum: host instanceof HTMLElement ? host.style.getPropertyValue('--lyrics-font-min') : '',
      panelOpacity: host instanceof HTMLElement ? host.style.getPropertyValue('--lyrics-panel-opacity') : '',
    };
  });

  let tabTranscriptionResponse = null;
  let tabTranscriptionRestoreState = null;
  if (isLocalSmoke) {
    tabTranscriptionResponse = await sendMessage({
      target: 'background',
      type: 'TRANSCRIBE_TAB_AUDIO',
      apiKey: 'qa-ephemeral-only',
      songContext: 'Karaoke Kaiju QA - 目前分頁測試',
      durationSeconds: 2,
      qaDryRun: true,
    });
    tabTranscriptionRestoreState = await sendMessage({
      target: 'background',
      type: 'GET_EXTENSION_STATE',
    });
  }
  if (screenshotPath) {
    await mediaPage.screenshot({ path: screenshotPath });
  }

  let queueSummary = null;
  if (isLocalSmoke) {
    const secondTrackUrl = new URL(smokeUrl);
    secondTrackUrl.searchParams.set('diaochangTrack', '2');
    const now = Date.now();
    await controllerPage.evaluate(
      ({ firstUrl, secondUrl, updatedAt }) =>
        chrome.storage.local.set({
          playlistLibraryV1: {
            schemaVersion: 1,
            updatedAt,
            playlists: [
              {
                id: 'smoke-playlist',
                name: '自動測試歌單',
                createdAt: updatedAt,
                updatedAt,
                tracks: [
                  {
                    id: 'track-1',
                    url: firstUrl,
                    title: '測試歌曲一',
                    artist: 'Karaoke Kaiju QA',
                    platform: '網頁媒體',
                    duration: 20,
                    addedAt: updatedAt,
                    practice: {
                      pitchSemitones: 2,
                      pitchCents: 0,
                      speed: 1,
                      loopStart: null,
                      loopEnd: null,
                      loopEnabled: false,
                    },
                  },
                  {
                    id: 'track-2',
                    url: secondUrl,
                    title: '測試歌曲二',
                    artist: 'Karaoke Kaiju QA',
                    platform: '網頁媒體',
                    duration: 20,
                    addedAt: updatedAt,
                    practice: {
                      pitchSemitones: -3,
                      pitchCents: 7,
                      speed: 1.25,
                      loopStart: null,
                      loopEnd: null,
                      loopEnabled: false,
                    },
                  },
                ],
              },
            ],
          },
        }),
      { firstUrl: smokeUrl, secondUrl: secondTrackUrl.toString(), updatedAt: now },
    );

    const sameTabPlayResponse = await sendMessage({
      target: 'background',
      type: 'PLAY_PLAYLIST_TRACK',
      playlistId: 'smoke-playlist',
      trackId: 'track-2',
      mode: 'sequential',
    });
    const sameTabState = await sendMessage({
      target: 'background',
      type: 'GET_EXTENSION_STATE',
    });

    const firstTrackResponse = await sendMessage({
      target: 'background',
      type: 'PLAY_PLAYLIST_TRACK',
      playlistId: 'smoke-playlist',
      trackId: 'track-1',
      mode: 'sequential',
    });
    await mediaPage.locator('audio').evaluate(async (media) => {
      media.currentTime = Math.max(0, media.duration - 0.2);
      await media.play();
    });

    let autoNextState = null;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await mediaPage.waitForTimeout(250);
      autoNextState = await sendMessage({
        target: 'background',
        type: 'GET_EXTENSION_STATE',
      });
      if (
        autoNextState?.data?.queue?.status === 'playing' &&
        autoNextState.data.queue.currentTrackId === 'track-2'
      ) {
        break;
      }
    }

    const repeatModeResponse = await sendMessage({
      target: 'background',
      type: 'SET_PLAYBACK_MODE',
      mode: 'repeat-one',
    });
    await mediaPage.locator('audio').evaluate(async (media) => {
      media.currentTime = Math.max(0, media.duration - 0.2);
      await media.play();
    });
    await mediaPage.waitForTimeout(1_000);
    const repeatState = await sendMessage({
      target: 'background',
      type: 'GET_EXTENSION_STATE',
    });

    queueSummary = {
      secondTrackUrl: secondTrackUrl.toString(),
      sameTabPlayResponse,
      sameTabState,
      firstTrackResponse,
      autoNextState,
      repeatModeResponse,
      repeatState,
    };
  }

  let soakSummary = null;
  if (soakSeconds > 0) {
    await sendMessage({
      target: 'background',
      type: 'MEDIA_COMMAND',
      command: { kind: 'CLEAR_LOOP' },
    });
    await sendMessage({
      target: 'background',
      type: 'MEDIA_COMMAND',
      command: { kind: 'SET_SPEED', speed: 1 },
    });
    await sendMessage({
      target: 'background',
      type: 'SET_PITCH',
      semitones: 0,
      cents: 0,
    });
    await mediaLocator.evaluate((media) => {
      media.loop = true;
    });

    const soakStartedAt = Date.now();
    const initialUnderruns = stateResponse.data?.audio?.underrunCount ?? 0;
    let lastUnderruns = initialUnderruns;
    let maximumLatencyMs = stateResponse.data?.audio?.baseLatencyMs ?? 0;
    let inactiveSamples = 0;
    let sampleCount = 0;

    while (Date.now() - soakStartedAt < soakSeconds * 1_000) {
      await mediaPage.waitForTimeout(1_000);
      const sample = await sendMessage({
        target: 'background',
        type: 'GET_EXTENSION_STATE',
      });
      sampleCount += 1;
      if (!sample?.ok || sample.data?.audio?.status !== 'active') {
        inactiveSamples += 1;
      }
      lastUnderruns = sample.data?.audio?.underrunCount ?? lastUnderruns;
      maximumLatencyMs = Math.max(
        maximumLatencyMs,
        sample.data?.audio?.baseLatencyMs ?? 0,
      );
    }

    soakSummary = {
      requestedSeconds: soakSeconds,
      actualSeconds: (Date.now() - soakStartedAt) / 1_000,
      sampleCount,
      inactiveSamples,
      initialUnderruns,
      finalUnderruns: lastUnderruns,
      addedUnderruns: lastUnderruns - initialUnderruns,
      maximumLatencyMs,
    };
  }

  const standardBeforeStopResponse = await sendMessage({
    target: 'background',
    type: 'SET_AUDIO_QUALITY',
    formantStrength: 0,
  });
  const stopResponse = await sendMessage({ target: 'background', type: 'STOP_AUDIO' });
  const restoreNaturalResponse = await sendMessage({
    target: 'background',
    type: 'SET_AUDIO_QUALITY',
    formantStrength: 1,
  });

  const result = {
    runtime: {
      browserTarget: browserLaunchOptions.channel
        ?? browserLaunchOptions.executablePath
        ?? 'playwright-chromium',
      browserVersion: context.browser()?.version() ?? 'unknown',
      operatingSystem: process.platform,
      architecture: process.arch,
    },
    extensionId,
    smokeUrl,
    publicUiSummary,
    syncCapability,
    tabSnapshot,
    coldDetectionStateResponse,
    coldStartResponse,
    coldStartCleanupResponse,
    autoStartClick,
    autoStartStateResponse,
    autoStartStopResponse,
    startResponse,
    bpmAnalysisResponse,
    publicExperimentalCommandResponses,
    standardQualityResponse,
    naturalQualityResponse,
    pitchResponse,
    speedResponse,
    loopStartResponse,
    loopEndResponse,
    loopToggleResponse,
    stateResponse,
    lyricsOverlayResponse,
    lyricsOverlayState,
    tabTranscriptionResponse,
    tabTranscriptionRestoreState,
    queueSummary,
    soakSummary,
    standardBeforeStopResponse,
    stopResponse,
    restoreNaturalResponse,
    errors,
  };

  console.log(JSON.stringify(result, null, 2));

  if (
    !coldDetectionStateResponse?.ok ||
    publicUiSummary.releaseChannel !== 'public' ||
    publicUiSummary.optionalHostPermissions.length !== 0 ||
    publicUiSummary.oauthConfigured !== false ||
    publicUiSummary.visibleExperimentalLabels.length !== 0 ||
    publicUiSummary.keyRangeOptions.join(',') !== '±6,±12' ||
    syncCapability.roundTrip !== true ||
    coldDetectionStateResponse.data?.media?.available !== true ||
    coldDetectionStateResponse.data?.mediaError !== null ||
    (coldStartCleanupResponse !== null && !coldStartCleanupResponse?.ok) ||
    !autoStartClick ||
    !autoStartStateResponse?.ok ||
    autoStartStateResponse.data?.audio?.status !== 'active' ||
    autoStartStateResponse.data?.audio?.pitchSemitones !== 1 ||
    !autoStartStopResponse?.ok ||
    !startResponse?.ok ||
    (isLocalSmoke && (bpmAnalysisResponse?.ok !== false || !String(bpmAnalysisResponse?.error ?? '').includes('開發版本'))) ||
    (publicExperimentalCommandResponses !== null && Object.values(publicExperimentalCommandResponses).some(
      (response) => response?.ok !== false || !String(response?.error ?? '').includes('開發版本'),
    )) ||
    !standardQualityResponse?.ok ||
    !naturalQualityResponse?.ok ||
    !pitchResponse?.ok ||
    !speedResponse?.ok ||
    !loopStartResponse?.ok ||
    !loopEndResponse?.ok ||
    !loopToggleResponse?.ok ||
    !stateResponse?.ok ||
    stateResponse.data?.audio?.status !== 'active' ||
    stateResponse.data?.audio?.formantStrength !== 1 ||
    stateResponse.data?.audio?.pitchSemitones !== 7 ||
    Math.abs(stateResponse.data?.media?.playbackRate - 0.75) > 0.001 ||
    stateResponse.data?.media?.loop?.enabled !== true ||
    stateResponse.data?.media?.loop?.start === null ||
    stateResponse.data?.media?.loop?.end === null ||
    !lyricsOverlayResponse?.ok ||
    lyricsOverlayState.mounted !== true ||
    lyricsOverlayState.hidden !== false ||
    lyricsOverlayState.bottom !== '13.5%' ||
    lyricsOverlayState.fontMinimum !== '30px' ||
    lyricsOverlayState.panelOpacity !== '0.66' ||
    !lyricsOverlayState.texts.some((text) => text?.includes('準備唱下一句')) ||
    (isLocalSmoke &&
      (tabTranscriptionResponse?.ok !== false ||
        !String(tabTranscriptionResponse?.error ?? '').includes('開發版本') ||
        tabTranscriptionRestoreState?.data?.audio?.status !== 'active' ||
        Math.abs(tabTranscriptionRestoreState?.data?.media?.playbackRate - 0.75) > 0.001 ||
        tabTranscriptionRestoreState?.data?.media?.loop?.enabled !== true)) ||
    stateResponse.data?.media?.currentTime < stateResponse.data?.media?.loop?.start - 0.1 ||
    stateResponse.data?.media?.currentTime > stateResponse.data?.media?.loop?.end + 0.2 ||
    (queueSummary !== null &&
      (!queueSummary.sameTabPlayResponse?.ok ||
        queueSummary.sameTabState?.data?.audio?.status !== 'active' ||
        queueSummary.sameTabState?.data?.audio?.pitchSemitones !== -3 ||
        queueSummary.sameTabState?.data?.audio?.pitchCents !== 7 ||
        Math.abs(queueSummary.sameTabState?.data?.media?.playbackRate - 1.25) > 0.001 ||
        queueSummary.sameTabState?.data?.queue?.currentTrackId !== 'track-2' ||
        !queueSummary.firstTrackResponse?.ok ||
        queueSummary.autoNextState?.data?.queue?.currentTrackId !== 'track-2' ||
        queueSummary.autoNextState?.data?.queue?.index !== 1 ||
        !queueSummary.repeatModeResponse?.ok ||
        queueSummary.repeatState?.data?.queue?.mode !== 'repeat-one' ||
        queueSummary.repeatState?.data?.queue?.currentTrackId !== 'track-2' ||
        queueSummary.repeatState?.data?.media?.currentTime > 5)) ||
    (isLocalSmoke && errors.length > 0) ||
    (soakSummary !== null && soakSummary.inactiveSamples > 0) ||
    !standardBeforeStopResponse?.ok ||
    !stopResponse?.ok ||
    stopResponse.data?.formantStrength !== 0 ||
    !restoreNaturalResponse?.ok ||
    restoreNaturalResponse.data?.formantStrength !== 1
  ) {
    process.exitCode = 1;
  }
} finally {
  await context?.close();
  if (qaServer) {
    await new Promise((resolveClose, rejectClose) =>
      qaServer.close((error) => (error ? rejectClose(error) : resolveClose())),
    );
  }
  await rm(userDataPath, { recursive: true, force: true });
}
