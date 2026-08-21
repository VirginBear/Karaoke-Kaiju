import { normalizeTrackUrl } from './library';
import { toSimplified, toTraditional } from './chinese-convert';

export type LyricsSource = 'lrc' | 'enhanced-lrc' | 'ai' | 'srt' | 'vtt' | 'manual';

export interface TimedLyricWord {
  text: string;
  start: number;
  end: number;
}

export interface TimedLyricLine {
  id: string;
  text: string;
  start: number;
  end: number;
  words: TimedLyricWord[];
}

export type LyricsLayoutMode = 'dock-bottom' | 'video-overlay' | 'ktv-stage';

export interface SongLyrics {
  id: string;
  trackUrl: string;
  title: string;
  artist: string;
  source: LyricsSource;
  sourceLabel: string;
  offsetMs: number;
  visible: boolean;
  fontScale: number;
  panelOpacity: number;
  verticalOffset: number;
  leadTimeSeconds: number;
  layoutMode?: LyricsLayoutMode;
  dockHeightPercent?: number;
  createdAt: number;
  updatedAt: number;
  lines: TimedLyricLine[];
  originalLines?: TimedLyricLine[];
}

export interface LyricsLibrary {
  schemaVersion: 1;
  updatedAt: number;
  entries: SongLyrics[];
}

export interface GroqWord {
  word?: string;
  text?: string;
  start: number;
  end: number;
}

export interface GroqSegment {
  start: number;
  end: number;
  text: string;
}

export interface GroqTranscription {
  text?: string;
  words?: GroqWord[];
  segments?: GroqSegment[];
}

export interface LyricFrame {
  activeIndex: number;
  current: TimedLyricLine | null;
  next: TimedLyricLine | null;
  progress: number;
  isUpcoming: boolean;
}

export const LYRICS_LIBRARY_STORAGE_KEY = 'lyricsLibraryV1';

export const EMPTY_LYRICS_LIBRARY: LyricsLibrary = {
  schemaVersion: 1,
  updatedAt: 0,
  entries: [],
};

const createBracketTimeRegex = () => /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
const createInlineTimeRegex = () => /<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>([^<]*)/g;
const CJK_EDGE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]$/u;
const CJK_START = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

function fractionToSeconds(value = ''): number {
  if (!value) {
    return 0;
  }
  return Number(`0.${value.padEnd(3, '0').slice(0, 3)}`);
}

function matchToSeconds(match: RegExpMatchArray): number {
  return Number(match[1]) * 60 + Number(match[2]) + fractionToSeconds(match[3]);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function appendToken(text: string, token: string): string {
  const normalized = token.trim();
  if (!normalized) {
    return text;
  }
  if (!text || (CJK_EDGE.test(text) && CJK_START.test(normalized))) {
    return `${text}${normalized}`;
  }
  return `${text} ${normalized}`;
}

export function finalizeLines(
  lines: Array<Omit<TimedLyricLine, 'end'> & { end?: number }>,
  duration?: number,
): TimedLyricLine[] {
  const sorted = lines
    .filter((line) => line.text.trim())
    .sort((left, right) => left.start - right.start);

  return sorted.map((line, index) => {
    const nextStart = sorted[index + 1]?.start;
    const estimatedEnd = line.start + clamp(line.text.length * 0.34, 2.5, 8);
    const end = line.end !== undefined && line.end > line.start
      ? line.end
      : Math.max(
          line.start + 0.25,
          nextStart ?? (duration && duration > line.start ? Math.min(duration, estimatedEnd) : estimatedEnd),
        );
    const words = (line.words || []).map((word, wordIndex) => ({
      ...word,
      end: Math.max(
        word.start + 0.04,
        line.words[wordIndex + 1]?.start ?? Math.min(end, word.end || end),
      ),
    }));
    return {
      id: line.id || `line-${index + 1}`,
      text: line.text.trim(),
      start: Math.max(0, line.start),
      end,
      words,
    };
  });
}

export function parseLrc(input: string): { source: LyricsSource; lines: TimedLyricLine[] } {
  const offsetMatch = input.match(/^\[offset:([+-]?\d+)\]$/im);
  const fileOffsetSeconds = Number(offsetMatch?.[1] ?? 0) / 1000;
  const parsed: Array<Omit<TimedLyricLine, 'end'>> = [];
  let enhanced = false;

  for (const rawLine of input.replace(/\r/g, '').split('\n')) {
    const bracketRegex = createBracketTimeRegex();
    const timestamps = [...rawLine.matchAll(bracketRegex)];
    if (timestamps.length === 0) {
      continue;
    }
    const lyricText = rawLine.replace(createBracketTimeRegex(), '').trim();
    const inlineMatches = [...lyricText.matchAll(createInlineTimeRegex())];
    const plainText = inlineMatches.length > 0
      ? inlineMatches.reduce((text, match) => appendToken(text, match[4]), '')
      : lyricText;

    if (!plainText) {
      continue;
    }

    if (inlineMatches.length > 0) {
      enhanced = true;
    }

    for (const timestamp of timestamps) {
      const lineStart = matchToSeconds(timestamp) + fileOffsetSeconds;
      const words = inlineMatches.map((match) => ({
        text: match[4].trim(),
        start: matchToSeconds(match) + fileOffsetSeconds,
        end: 0,
      })).filter((word) => word.text);
      parsed.push({
        id: `line-${parsed.length + 1}`,
        text: plainText,
        start: Math.max(0, lineStart),
        words,
      });
    }
  }

  if (parsed.length === 0) {
    throw new Error('找不到 LRC 時間碼，格式應為 [00:12.34]歌詞');
  }

  return {
    source: enhanced ? 'enhanced-lrc' : 'lrc',
    lines: finalizeLines(parsed),
  };
}

const SRT_TIMESTAMP = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;

function parseSrtTimestamp(hours: string, minutes: string, seconds: string, ms: string): number {
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(ms.padEnd(3, '0').slice(0, 3)) / 1000
  );
}

export function parseSrt(input: string, duration?: number): { source: LyricsSource; lines: TimedLyricLine[] } {
  const blocks = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\s*\n/);
  const parsed: Array<Omit<TimedLyricLine, 'end'> & { end: number }> = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Find the timestamp line
    let timeIndex = -1;
    let match: RegExpMatchArray | null = null;
    for (let i = 0; i < lines.length; i += 1) {
      const m = lines[i]?.match(SRT_TIMESTAMP);
      if (m) {
        timeIndex = i;
        match = m;
        break;
      }
    }
    if (!match || timeIndex === -1) continue;

    const start = parseSrtTimestamp(match[1], match[2], match[3], match[4]);
    const end = parseSrtTimestamp(match[5], match[6], match[7], match[8]);
    const textLines = lines.slice(timeIndex + 1);
    const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim();

    if (!text) continue;

    parsed.push({
      id: `srt-line-${parsed.length + 1}`,
      text,
      start: Math.max(0, start),
      end: Math.max(start + 0.1, end),
      words: [],
    });
  }

  if (parsed.length === 0) {
    throw new Error('找不到有效的 SRT 時間碼與字幕');
  }

  return {
    source: 'srt',
    lines: finalizeLines(parsed, duration),
  };
}

const VTT_TIMESTAMP = /(?:(\d{1,2}):)?(\d{2}):(\d{2})\.(\d{1,3})\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})\.(\d{1,3})/;

function parseVttTimestamp(hours: string | undefined, minutes: string, seconds: string, ms: string): number {
  const h = hours ? Number(hours) : 0;
  return (
    h * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(ms.padEnd(3, '0').slice(0, 3)) / 1000
  );
}

export function parseVtt(input: string, duration?: number): { source: LyricsSource; lines: TimedLyricLine[] } {
  const clean = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = clean.split(/\n\s*\n/);
  const parsed: Array<Omit<TimedLyricLine, 'end'> & { end: number }> = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0 || lines[0].startsWith('WEBVTT') || lines[0].startsWith('NOTE')) {
      continue;
    }

    let timeIndex = -1;
    let match: RegExpMatchArray | null = null;
    for (let i = 0; i < lines.length; i += 1) {
      const m = lines[i]?.match(VTT_TIMESTAMP);
      if (m) {
        timeIndex = i;
        match = m;
        break;
      }
    }
    if (!match || timeIndex === -1) continue;

    const start = parseVttTimestamp(match[1], match[2], match[3], match[4]);
    const end = parseVttTimestamp(match[5], match[6], match[7], match[8]);
    const textLines = lines.slice(timeIndex + 1);
    const text = textLines.join(' ').replace(/<[^>]+>/g, '').trim();

    if (!text) continue;

    parsed.push({
      id: `vtt-line-${parsed.length + 1}`,
      text,
      start: Math.max(0, start),
      end: Math.max(start + 0.1, end),
      words: [],
    });
  }

  if (parsed.length === 0) {
    throw new Error('找不到有效的 WebVTT 時間碼與字幕');
  }

  return {
    source: 'vtt',
    lines: finalizeLines(parsed, duration),
  };
}

export function parsePlainText(input: string, defaultDuration = 180): { source: LyricsSource; lines: TimedLyricLine[] } {
  const rawLines = input
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) {
    throw new Error('請輸入歌詞文字');
  }

  const interval = Math.max(3, Math.min(6, defaultDuration / (rawLines.length + 1)));
  const parsed: TimedLyricLine[] = rawLines.map((text, index) => {
    const start = Math.round((index * interval + 1) * 10) / 10;
    const end = Math.round((start + interval * 0.9) * 10) / 10;
    return {
      id: `plain-line-${index + 1}`,
      text,
      start,
      end,
      words: [],
    };
  });

  return {
    source: 'manual',
    lines: parsed,
  };
}

export function parseGenericLyrics(
  input: string,
  duration?: number,
): { source: LyricsSource; lines: TimedLyricLine[] } {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('歌詞內容為空');
  }

  const shared = parseLyricsShareCode(trimmed);
  if (shared && shared.lines.length > 0) {
    return {
      source: 'lrc',
      lines: shared.lines,
    };
  }

  if (trimmed.startsWith('WEBVTT') || (trimmed.includes('-->') && trimmed.includes('.'))) {
    try {
      return parseVtt(trimmed, duration);
    } catch {
      // Fallback
    }
  }

  if (trimmed.includes('-->')) {
    try {
      return parseSrt(trimmed, duration);
    } catch {
      // Fallback
    }
  }

  if (/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/.test(trimmed)) {
    try {
      return parseLrc(trimmed);
    } catch {
      // Fallback
    }
  }

  return parsePlainText(trimmed, duration);
}

export function parseGroqTranscription(
  transcription: GroqTranscription,
  duration?: number,
): TimedLyricLine[] {
  const sourceWords = (transcription.words ?? [])
    .map((word) => ({
      text: (word.word ?? word.text ?? '').trim(),
      start: Number(word.start),
      end: Number(word.end),
    }))
    .filter((word) => word.text && Number.isFinite(word.start) && Number.isFinite(word.end));
  const segments = (transcription.segments ?? [])
    .filter((segment) => segment.text?.trim() && Number.isFinite(segment.start) && Number.isFinite(segment.end));

  const parsed: Array<Omit<TimedLyricLine, 'end'>> = segments.map((segment, index) => {
    const words = sourceWords.filter(
      (word) => word.start >= segment.start - 0.08 && word.start < segment.end + 0.08,
    );
    const text = words.length > 0
      ? words.reduce((combined, word) => appendToken(combined, word.text), '')
      : segment.text.trim();
    return {
      id: `ai-line-${index + 1}`,
      text,
      start: Math.max(0, segment.start),
      words,
    };
  });

  if (parsed.length === 0 && sourceWords.length > 0) {
    for (let index = 0; index < sourceWords.length; index += 8) {
      const words = sourceWords.slice(index, index + 8);
      parsed.push({
        id: `ai-line-${parsed.length + 1}`,
        text: words.reduce((combined, word) => appendToken(combined, word.text), ''),
        start: words[0]?.start ?? 0,
        words,
      });
    }
  }

  if (parsed.length === 0) {
    throw new Error('AI 沒有回傳可用的逐句或逐字時間碼');
  }

  return finalizeLines(parsed, duration);
}

function formatSecondsToLrcTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const hundredths = Math.floor((safe % 1) * 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function formatSecondsToSrtTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatSecondsToVttTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function exportToLrc(lyrics: SongLyrics): string {
  const headers = [
    `[ti:${lyrics.title || 'Unknown Title'}]`,
    `[ar:${lyrics.artist || 'Unknown Artist'}]`,
    `[offset:${lyrics.offsetMs || 0}]`,
  ];
  const lines = lyrics.lines.map((line) => {
    if (line.words && line.words.length > 0) {
      const wordStr = line.words
        .map((w) => `<${formatSecondsToLrcTime(w.start)}>${w.text}`)
        .join(' ');
      return `[${formatSecondsToLrcTime(line.start)}]${wordStr}`;
    }
    return `[${formatSecondsToLrcTime(line.start)}]${line.text}`;
  });
  return [...headers, ...lines].join('\n');
}

export function exportToSrt(lyrics: SongLyrics): string {
  const offsetSec = (lyrics.offsetMs || 0) / 1000;
  return lyrics.lines
    .map((line, index) => {
      const start = Math.max(0, line.start + offsetSec);
      const end = Math.max(start + 0.1, line.end + offsetSec);
      return `${index + 1}\n${formatSecondsToSrtTime(start)} --> ${formatSecondsToSrtTime(end)}\n${line.text}\n`;
    })
    .join('\n');
}

export function exportToVtt(lyrics: SongLyrics): string {
  const offsetSec = (lyrics.offsetMs || 0) / 1000;
  const cues = lyrics.lines
    .map((line) => {
      const start = Math.max(0, line.start + offsetSec);
      const end = Math.max(start + 0.1, line.end + offsetSec);
      return `${formatSecondsToVttTime(start)} --> ${formatSecondsToVttTime(end)}\n${line.text}`;
    })
    .join('\n\n');
  return `WEBVTT\n\n${cues}\n`;
}

export function createSongLyrics(options: {
  id: string;
  trackUrl: string;
  title: string;
  artist: string;
  source: LyricsSource;
  sourceLabel: string;
  lines: TimedLyricLine[];
  now: number;
  previous?: SongLyrics;
}): SongLyrics {
  const originalLines = options.previous?.originalLines ?? options.lines;
  return {
    id: options.previous?.id ?? options.id,
    trackUrl: normalizeTrackUrl(options.trackUrl),
    title: options.title,
    artist: options.artist,
    source: options.source,
    sourceLabel: options.sourceLabel,
    offsetMs: options.previous?.offsetMs ?? 0,
    visible: options.previous?.visible ?? true,
    fontScale: options.previous?.fontScale ?? 1,
    panelOpacity: options.previous?.panelOpacity ?? 0.55,
    verticalOffset: options.previous?.verticalOffset ?? 0,
    leadTimeSeconds: options.previous?.leadTimeSeconds ?? 1.5,
    layoutMode: options.previous?.layoutMode ?? 'dock-bottom',
    dockHeightPercent: options.previous?.dockHeightPercent ?? 30,
    createdAt: options.previous?.createdAt ?? options.now,
    updatedAt: options.now,
    lines: options.lines,
    originalLines,
  };
}

export function updateLyricLine(
  lyrics: SongLyrics,
  lineId: string,
  patch: Partial<TimedLyricLine>,
  now = Date.now(),
): SongLyrics {
  const lines = lyrics.lines.map((line) => {
    if (line.id !== lineId) return line;
    const start = patch.start !== undefined ? Math.max(0, patch.start) : line.start;
    const end = patch.end !== undefined ? Math.max(start + 0.1, patch.end) : line.end;
    const text = patch.text !== undefined ? patch.text.trim() : line.text;
    return {
      ...line,
      ...patch,
      start,
      end,
      text,
    };
  });
  return {
    ...lyrics,
    updatedAt: now,
    lines: finalizeLines(lines),
  };
}

export function batchShiftLyricLines(
  lyrics: SongLyrics,
  fromLineId: string | null,
  deltaSeconds: number,
  now = Date.now(),
): SongLyrics {
  const fromIndex = fromLineId
    ? lyrics.lines.findIndex((l) => l.id === fromLineId)
    : 0;
  const startIndex = fromIndex >= 0 ? fromIndex : 0;

  const lines = lyrics.lines.map((line, index) => {
    if (index < startIndex) return line;
    const start = Math.max(0, Math.round((line.start + deltaSeconds) * 100) / 100);
    const end = Math.max(start + 0.1, Math.round((line.end + deltaSeconds) * 100) / 100);
    const words = line.words.map((w) => ({
      ...w,
      start: Math.max(0, Math.round((w.start + deltaSeconds) * 100) / 100),
      end: Math.max(0, Math.round((w.end + deltaSeconds) * 100) / 100),
    }));
    return { ...line, start, end, words };
  });

  return {
    ...lyrics,
    updatedAt: now,
    lines: finalizeLines(lines),
  };
}

export function addLyricLine(
  lyrics: SongLyrics,
  afterLineId: string | null,
  text: string,
  start: number,
  end?: number,
  now = Date.now(),
): SongLyrics {
  const newLine: TimedLyricLine = {
    id: `custom-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text: text.trim(),
    start: Math.max(0, start),
    end: end && end > start ? end : start + 3,
    words: [],
  };

  let lines: TimedLyricLine[];
  if (!afterLineId) {
    lines = [newLine, ...lyrics.lines];
  } else {
    const idx = lyrics.lines.findIndex((l) => l.id === afterLineId);
    if (idx === -1) {
      lines = [...lyrics.lines, newLine];
    } else {
      lines = [
        ...lyrics.lines.slice(0, idx + 1),
        newLine,
        ...lyrics.lines.slice(idx + 1),
      ];
    }
  }

  return {
    ...lyrics,
    updatedAt: now,
    lines: finalizeLines(lines),
  };
}

export function removeLyricLine(
  lyrics: SongLyrics,
  lineId: string,
  now = Date.now(),
): SongLyrics {
  const lines = lyrics.lines.filter((l) => l.id !== lineId);
  return {
    ...lyrics,
    updatedAt: now,
    lines: finalizeLines(lines),
  };
}

export function resetLyricLinesToOriginal(
  lyrics: SongLyrics,
  now = Date.now(),
): SongLyrics {
  if (!lyrics.originalLines || lyrics.originalLines.length === 0) {
    return lyrics;
  }
  return {
    ...lyrics,
    updatedAt: now,
    lines: finalizeLines(lyrics.originalLines),
  };
}

export function upsertLyrics(
  library: LyricsLibrary,
  entry: SongLyrics,
): LyricsLibrary {
  const key = normalizeTrackUrl(entry.trackUrl);
  return {
    schemaVersion: 1,
    updatedAt: entry.updatedAt,
    entries: [
      entry,
      ...library.entries.filter((item) => normalizeTrackUrl(item.trackUrl) !== key),
    ],
  };
}

export function removeLyrics(
  library: LyricsLibrary,
  trackUrl: string,
  now = Date.now(),
): LyricsLibrary {
  const key = normalizeTrackUrl(trackUrl);
  return {
    schemaVersion: 1,
    updatedAt: now,
    entries: library.entries.filter((item) => normalizeTrackUrl(item.trackUrl) !== key),
  };
}

export function findLyrics(library: LyricsLibrary, trackUrl: string): SongLyrics | null {
  const key = normalizeTrackUrl(trackUrl);
  return library.entries.find((entry) => normalizeTrackUrl(entry.trackUrl) === key) ?? null;
}

export function updateLyricsPresentation(
  library: LyricsLibrary,
  trackUrl: string,
  patch: Pick<
    Partial<SongLyrics>,
    | 'offsetMs'
    | 'visible'
    | 'fontScale'
    | 'panelOpacity'
    | 'verticalOffset'
    | 'leadTimeSeconds'
    | 'layoutMode'
    | 'dockHeightPercent'
    | 'lines'
  >,
  now = Date.now(),
): LyricsLibrary {
  const key = normalizeTrackUrl(trackUrl);
  return {
    ...library,
    updatedAt: now,
    entries: library.entries.map((entry) =>
      normalizeTrackUrl(entry.trackUrl) === key
        ? { ...entry, ...patch, updatedAt: now }
        : entry,
    ),
  };
}

export function computeLyricProgress(line: TimedLyricLine, time: number): number {
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

export function getLyricFrame(
  lines: TimedLyricLine[],
  time: number,
  leadTimeSeconds = 1.5,
): LyricFrame {
  if (lines.length === 0) {
    return { activeIndex: -1, current: null, next: null, progress: 0, isUpcoming: false };
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
      isUpcoming,
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
  // Next line is shown if within leadTimeSeconds from its start
  const next = candidateNext && time >= candidateNext.start - leadTimeSeconds
    ? candidateNext
    : null;

  return {
    activeIndex,
    current,
    next,
    progress: current ? computeLyricProgress(current, time) : 0,
    isUpcoming: false,
  };
}

export function convertSongLyricsChinese(
  lyrics: SongLyrics,
  target: 'traditional' | 'simplified',
): SongLyrics {
  const convertText = target === 'traditional' ? toTraditional : toSimplified;
  return {
    ...lyrics,
    lines: lyrics.lines.map((line) => ({
      ...line,
      text: convertText(line.text),
      words: line.words.map((word) => ({
        ...word,
        text: convertText(word.text),
      })),
    })),
    originalLines: lyrics.originalLines?.map((line) => ({
      ...line,
      text: convertText(line.text),
      words: line.words.map((word) => ({
        ...word,
        text: convertText(word.text),
      })),
    })),
    updatedAt: Date.now(),
  };
}

export function exportLyricsShareCode(lyrics: SongLyrics): string {
  const payload = {
    diaochangLyricsVersion: 1,
    title: lyrics.title,
    artist: lyrics.artist,
    trackUrl: lyrics.trackUrl,
    offsetMs: lyrics.offsetMs,
    lines: lyrics.lines,
  };
  return `diaochang://lyrics/${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
}

export function parseLyricsShareCode(code: string): SongLyrics | null {
  try {
    let raw = code.trim();
    if (raw.startsWith('diaochang://lyrics/')) {
      raw = raw.replace('diaochang://lyrics/', '');
    }
    const json = decodeURIComponent(escape(atob(raw)));
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.lines) || parsed.lines.length === 0) return null;
    return {
      id: crypto.randomUUID(),
      trackUrl: parsed.trackUrl || '',
      title: parsed.title || '社群分享歌詞',
      artist: parsed.artist || '',
      source: 'lrc',
      sourceLabel: '社群分享歌詞',
      visible: true,
      offsetMs: parsed.offsetMs ?? 0,
      fontScale: 1,
      panelOpacity: 0.88,
      verticalOffset: 0,
      leadTimeSeconds: 1.5,
      layoutMode: 'dock-bottom',
      dockHeightPercent: 30,
      lines: parsed.lines,
      originalLines: parsed.lines,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
}


