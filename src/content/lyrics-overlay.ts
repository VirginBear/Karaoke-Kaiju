import type { LyricsOverlayPayload } from '../shared/protocol';

type LyricLine = LyricsOverlayPayload['lines'][number];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function computeLyricProgress(line: LyricLine, time: number): number {
  if (time <= line.start) {
    return 0;
  }
  if (time >= line.end) {
    return 1;
  }
  if (line.words.length === 0) {
    return clamp((time - line.start) / Math.max(0.01, line.end - line.start), 0, 1);
  }

  const totalLength = line.words.reduce((total, word) => total + Math.max(1, word.text.length), 0);
  let completed = 0;
  for (const word of line.words) {
    const length = Math.max(1, word.text.length);
    if (time >= word.end) {
      completed += length;
      continue;
    }
    if (time > word.start) {
      completed += length * clamp((time - word.start) / Math.max(0.01, word.end - word.start), 0, 1);
    }
    break;
  }
  return clamp(completed / Math.max(1, totalLength), 0, 1);
}

function getLyricFrame(lines: LyricLine[], time: number, leadTimeSeconds = 1.5) {
  if (lines.length === 0) {
    return { activeIndex: -1, current: null, next: null, progress: 0 };
  }

  // Before first line
  if (time < (lines[0]?.start ?? 0)) {
    const firstLine = lines[0];
    const isUpcoming = time >= firstLine.start - leadTimeSeconds;
    return {
      activeIndex: -1,
      current: null,
      next: isUpcoming ? firstLine : null,
      progress: 0,
    };
  }

  let activeIndex = 0;
  for (let index = 0; index < lines.length; index += 1) {
    if ((lines[index]?.start ?? Infinity) <= time) {
      activeIndex = index;
    } else {
      break;
    }
  }
  const current = lines[activeIndex] ?? null;
  const candidateNext = lines[activeIndex + 1] ?? null;
  const next = candidateNext && time >= candidateNext.start - leadTimeSeconds
    ? candidateNext
    : null;

  return {
    activeIndex,
    current,
    next,
    progress: current ? computeLyricProgress(current, time) : 0,
  };
}

interface LyricSlot {
  root: HTMLDivElement;
  base: HTMLSpanElement;
  fill: HTMLSpanElement;
}

export interface LyricsOverlayController {
  setLyrics: (lyrics: LyricsOverlayPayload | null) => void;
  update: (time: number, media: HTMLMediaElement | null) => void;
  destroy: () => void;
}

function createSlot(className: string): LyricSlot {
  const root = document.createElement('div');
  root.className = `lyric-line ${className}`;
  const base = document.createElement('span');
  base.className = 'lyric-base';
  const fill = document.createElement('span');
  fill.className = 'lyric-fill';
  root.append(base, fill);
  return { root, base, fill };
}

export function createLyricsOverlayController(options?: {
  onSettingsChange?: (patch: Partial<LyricsOverlayPayload>) => void;
}): LyricsOverlayController {
  const host = document.createElement('div');
  host.id = 'diaochang-karaoke-overlay';
  host.setAttribute('aria-label', 'Karaoke Kaiju 動態歌詞');
  host.setAttribute('data-layout', 'dock-bottom');

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      z-index: 2147483640;
      color-scheme: dark;
      contain: layout style paint;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang TC", "Noto Sans TC", sans-serif;
      user-select: none;
      -webkit-user-select: none;
    }

    :host([data-layout="dock-bottom"]) {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      height: var(--lyrics-dock-height, 30vh);
      pointer-events: auto;
    }

    :host([data-layout="video-overlay"]) {
      position: absolute;
      left: 1.6%;
      right: 1.6%;
      bottom: var(--lyrics-video-bottom, 9.5%);
      height: 31%;
      pointer-events: auto;
    }

    .karaoke-panel {
      position: absolute;
      inset: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      transition: background 180ms ease;
    }

    :host([data-layout="dock-bottom"]) .karaoke-panel {
      border-top: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 16px 16px 0 0;
      background: rgba(15, 15, 18, var(--lyrics-panel-opacity, 0.88));
      box-shadow: 0 -8px 36px rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(16px) saturate(140%);
      -webkit-backdrop-filter: blur(16px) saturate(140%);
    }

    :host([data-layout="video-overlay"]) .karaoke-panel {
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: clamp(12px, 1.1vw, 20px);
      background: rgba(0, 0, 0, var(--lyrics-panel-opacity, 0.55));
      box-shadow: 0 12px 38px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(7px) saturate(115%);
      -webkit-backdrop-filter: blur(7px) saturate(115%);
    }

    /* Resize Handle */
    .dock-resize-handle {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 14px;
      cursor: ns-resize;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10;
    }

    .dock-resize-pill {
      width: 42px;
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.28);
      transition: background 140ms ease, transform 140ms ease;
    }

    .dock-resize-handle:hover .dock-resize-pill {
      background: #0A84FF;
      transform: scaleY(1.3);
    }

    /* Hover Quick Settings Toolbar */
    .dock-quick-toolbar {
      position: absolute;
      top: 10px;
      right: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 9px;
      background: rgba(30, 30, 35, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(8px);
      opacity: 0;
      transform: translateY(-4px);
      pointer-events: none;
      transition: opacity 160ms ease, transform 160ms ease;
      z-index: 20;
    }

    .karaoke-panel:hover .dock-quick-toolbar {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .dock-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 3px 7px;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition: all 120ms ease;
    }

    .dock-btn:hover {
      background: #0A84FF;
      border-color: #0A84FF;
    }

    .dock-label {
      color: rgba(255, 255, 255, 0.65);
      font-size: 10px;
      font-weight: 600;
      margin-right: 2px;
    }

    /* Lyric Line Slots */
    .lyric-line {
      position: absolute;
      display: inline-grid;
      max-width: 90%;
      font-size: clamp(var(--lyrics-font-min, 26px), var(--lyrics-font-fluid, 4.2vw), var(--lyrics-font-max, 64px));
      line-height: 1.14;
      font-weight: 760;
      letter-spacing: 0.025em;
      white-space: nowrap;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.95));
      transition: opacity 140ms ease, transform 180ms ease;
      pointer-events: none;
    }

    :host([data-layout="dock-bottom"]) .lyric-line.is-left { left: 4.5%; top: 16%; text-align: left; }
    :host([data-layout="dock-bottom"]) .lyric-line.is-right { right: 4.5%; bottom: 14%; text-align: right; }
    :host([data-layout="video-overlay"]) .lyric-line.is-left { left: 4.2%; top: 13%; text-align: left; }
    :host([data-layout="video-overlay"]) .lyric-line.is-right { right: 4.2%; bottom: 12%; text-align: right; }

    :host([data-layout="ktv-stage"]) {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      height: 40%;
      z-index: 2147483646;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(3, 7, 18, 0.85) 30%, rgba(2, 6, 23, 0.98) 100%);
      pointer-events: none;
      backdrop-filter: blur(8px);
    }
    :host([data-layout="ktv-stage"]) .karaoke-panel {
      border: none;
      box-shadow: none;
      background: transparent;
    }
    :host([data-layout="ktv-stage"]) .lyric-line {
      font-size: clamp(32px, 5.2vw, 80px);
      letter-spacing: 0.04em;
      filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.98)) drop-shadow(0 0 24px rgba(0, 240, 255, 0.35));
    }
    :host([data-layout="ktv-stage"]) .lyric-line.is-left { left: 5%; top: 12%; text-align: left; }
    :host([data-layout="ktv-stage"]) .lyric-line.is-right { right: 5%; bottom: 12%; text-align: right; }
    :host([data-layout="ktv-stage"]) .lyric-fill {
      color: #00F0FF;
      text-shadow: 0 0 16px rgba(0, 240, 255, 0.9);
    }

    .lyric-line.is-upcoming { opacity: 0.92; transform: scale(0.96); }
    .lyric-base, .lyric-fill { grid-area: 1 / 1; }
    .lyric-base {
      color: #fff;
      -webkit-text-stroke: clamp(0.5px, 0.08vw, 1.5px) rgba(0, 0, 0, 0.72);
    }
    .lyric-fill {
      color: #0A84FF;
      -webkit-text-stroke: clamp(0.5px, 0.08vw, 1.5px) rgba(255, 255, 255, 0.82);
      clip-path: inset(0 100% 0 0);
      will-change: clip-path;
    }

    @media (prefers-reduced-motion: reduce) {
      .lyric-line { transition: none; }
    }
  `;

  const panel = document.createElement('section');
  panel.className = 'karaoke-panel';
  panel.setAttribute('aria-live', 'off');

  // Resize Handle for Docked Mode
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'dock-resize-handle';
  const resizePill = document.createElement('div');
  resizePill.className = 'dock-resize-pill';
  resizeHandle.append(resizePill);

  // Quick Hover Toolbar
  const quickToolbar = document.createElement('div');
  quickToolbar.className = 'dock-quick-toolbar';

  const offsetMinusHalf = document.createElement('button');
  offsetMinusHalf.className = 'dock-btn';
  offsetMinusHalf.textContent = '-0.5s';
  offsetMinusHalf.title = '提早 0.5 秒';

  const offsetMinusTenth = document.createElement('button');
  offsetMinusTenth.className = 'dock-btn';
  offsetMinusTenth.textContent = '-0.1s';
  offsetMinusTenth.title = '提早 0.1 秒';

  const offsetReset = document.createElement('button');
  offsetReset.className = 'dock-btn';
  offsetReset.textContent = '重設';
  offsetReset.title = '重設對時';

  const offsetPlusTenth = document.createElement('button');
  offsetPlusTenth.className = 'dock-btn';
  offsetPlusTenth.textContent = '+0.1s';
  offsetPlusTenth.title = '延後 0.1 秒';

  const offsetPlusHalf = document.createElement('button');
  offsetPlusHalf.className = 'dock-btn';
  offsetPlusHalf.textContent = '+0.5s';
  offsetPlusHalf.title = '延後 0.5 秒';

  const fontMinus = document.createElement('button');
  fontMinus.className = 'dock-btn';
  fontMinus.textContent = 'A-';
  fontMinus.title = '縮小字體';

  const fontPlus = document.createElement('button');
  fontPlus.className = 'dock-btn';
  fontPlus.textContent = 'A+';
  fontPlus.title = '放大字體';

  const modeToggle = document.createElement('button');
  modeToggle.className = 'dock-btn';
  modeToggle.textContent = '切換內嵌';
  modeToggle.title = '切換為影片內嵌字幕';

  quickToolbar.append(
    offsetMinusHalf,
    offsetMinusTenth,
    offsetReset,
    offsetPlusTenth,
    offsetPlusHalf,
    fontMinus,
    fontPlus,
    modeToggle,
  );

  const left = createSlot('is-left');
  const right = createSlot('is-right');
  panel.append(resizeHandle, quickToolbar, left.root, right.root);
  shadow.append(style, panel);

  let payload: LyricsOverlayPayload | null = null;
  let lastCurrentId = '';
  let lastNextId = '';
  let lastProgress = -1;

  // Drag Resize Interaction
  let isDragging = false;
  let startY = 0;
  let startHeightVh = 30;

  const onPointerDown = (e: PointerEvent) => {
    isDragging = true;
    startY = e.clientY;
    const currentPercent = payload?.dockHeightPercent ?? 30;
    startHeightVh = currentPercent;
    resizeHandle.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const deltaY = startY - e.clientY;
    const deltaVh = (deltaY / window.innerHeight) * 100;
    const nextHeight = Math.round(clamp(startHeightVh + deltaVh, 18, 50));
    host.style.setProperty('--lyrics-dock-height', `${nextHeight}vh`);
    if (payload) {
      payload.dockHeightPercent = nextHeight;
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    try {
      resizeHandle.releasePointerCapture(e.pointerId);
    } catch {}
    const finalHeight = payload?.dockHeightPercent ?? 30;
    options?.onSettingsChange?.({ dockHeightPercent: finalHeight });
  };

  const onHandleDblClick = () => {
    host.style.setProperty('--lyrics-dock-height', '30vh');
    if (payload) payload.dockHeightPercent = 30;
    options?.onSettingsChange?.({ dockHeightPercent: 30 });
  };

  resizeHandle.addEventListener('pointerdown', onPointerDown);
  resizeHandle.addEventListener('pointermove', onPointerMove);
  resizeHandle.addEventListener('pointerup', onPointerUp);
  resizeHandle.addEventListener('pointercancel', onPointerUp);
  resizeHandle.addEventListener('dblclick', onHandleDblClick);

  // Quick toolbar action handlers
  offsetMinusHalf.addEventListener('click', () => {
    if (!payload) return;
    const next = payload.offsetMs - 500;
    options?.onSettingsChange?.({ offsetMs: next });
  });
  offsetMinusTenth.addEventListener('click', () => {
    if (!payload) return;
    const next = payload.offsetMs - 100;
    options?.onSettingsChange?.({ offsetMs: next });
  });
  offsetReset.addEventListener('click', () => {
    if (!payload) return;
    options?.onSettingsChange?.({ offsetMs: 0 });
  });
  offsetPlusTenth.addEventListener('click', () => {
    if (!payload) return;
    const next = payload.offsetMs + 100;
    options?.onSettingsChange?.({ offsetMs: next });
  });
  offsetPlusHalf.addEventListener('click', () => {
    if (!payload) return;
    const next = payload.offsetMs + 500;
    options?.onSettingsChange?.({ offsetMs: next });
  });
  fontMinus.addEventListener('click', () => {
    if (!payload) return;
    const next = Math.round(clamp((payload.fontScale ?? 1) - 0.1, 0.8, 1.4) * 20) / 20;
    options?.onSettingsChange?.({ fontScale: next });
  });
  fontPlus.addEventListener('click', () => {
    if (!payload) return;
    const next = Math.round(clamp((payload.fontScale ?? 1) + 0.1, 0.8, 1.4) * 20) / 20;
    options?.onSettingsChange?.({ fontScale: next });
  });
  modeToggle.addEventListener('click', () => {
    if (!payload) return;
    const currentMode = payload.layoutMode ?? 'dock-bottom';
    const nextMode =
      currentMode === 'dock-bottom'
        ? 'ktv-stage'
        : currentMode === 'ktv-stage'
        ? 'video-overlay'
        : 'dock-bottom';
    options?.onSettingsChange?.({ layoutMode: nextMode });
  });

  const setSlot = (slot: LyricSlot, text: string, progress: number, upcoming: boolean) => {
    slot.root.hidden = !text;
    if (!text) {
      return;
    }
    if (slot.base.textContent !== text) {
      slot.base.textContent = text;
      slot.fill.textContent = text;
    }
    slot.root.classList.toggle('is-upcoming', upcoming);
    slot.fill.style.clipPath = `inset(0 ${Math.max(0, 100 - progress * 100).toFixed(2)}% 0 0)`;
  };

  const ensureMounted = (media: HTMLMediaElement | null) => {
    const layout = payload?.layoutMode ?? 'dock-bottom';
    if (layout === 'dock-bottom') {
      const target = document.body ?? document.documentElement;
      if (target && host.parentElement !== target) {
        target.append(host);
      }
    } else {
      const youtubePlayer = document.querySelector<HTMLElement>('#movie_player');
      const target = youtubePlayer ?? media?.parentElement ?? document.body;
      if (target && host.parentElement !== target) {
        target.append(host);
      }
    }
  };

  return {
    setLyrics(lyrics) {
      payload = lyrics;
      lastCurrentId = '';
      lastNextId = '';
      lastProgress = -1;

      const layout = lyrics?.layoutMode ?? 'dock-bottom';
      host.setAttribute('data-layout', layout);

      const fontScale = Math.min(1.4, Math.max(0.8, lyrics?.fontScale ?? 1));
      host.style.setProperty('--lyrics-font-min', `${25 * fontScale}px`);
      host.style.setProperty('--lyrics-font-fluid', `${4.15 * fontScale}vw`);
      host.style.setProperty('--lyrics-font-max', `${62 * fontScale}px`);
      host.style.setProperty(
        '--lyrics-panel-opacity',
        String(Math.min(0.95, Math.max(0.2, lyrics?.panelOpacity ?? 0.88))),
      );
      host.style.setProperty(
        '--lyrics-dock-height',
        `${lyrics?.dockHeightPercent ?? 30}vh`,
      );
      host.style.bottom = layout === 'dock-bottom'
        ? '0'
        : `${9.5 + Math.min(24, Math.max(-6, lyrics?.verticalOffset ?? 0))}%`;

      modeToggle.textContent = layout === 'dock-bottom' ? '切換內嵌' : '切換底欄';
      resizeHandle.hidden = layout !== 'dock-bottom';

      host.hidden = !lyrics?.visible || !lyrics.lines.length;
    },
    update(time, media) {
      if (!payload?.visible || payload.lines.length === 0) {
        host.hidden = true;
        return;
      }
      ensureMounted(media);
      host.hidden = false;
      const frame = getLyricFrame(
        payload.lines,
        time + payload.offsetMs / 1000,
        payload.leadTimeSeconds ?? 1.5,
      );
      const currentId = frame.current?.id ?? '';
      const nextId = frame.next?.id ?? '';
      if (
        currentId === lastCurrentId &&
        nextId === lastNextId &&
        Math.abs(frame.progress - lastProgress) < 0.002
      ) {
        return;
      }
      lastCurrentId = currentId;
      lastNextId = nextId;
      lastProgress = frame.progress;

      const currentSlot = frame.activeIndex % 2 === 0 ? left : right;
      const nextSlot = currentSlot === left ? right : left;
      setSlot(currentSlot, frame.current?.text ?? '', frame.progress, false);
      setSlot(nextSlot, frame.next?.text ?? '', 0, true);
    },
    destroy() {
      host.remove();
    },
  };
}
