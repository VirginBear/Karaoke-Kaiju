// Conflict-free keyboard shortcuts definitions and helper functions for Karaoke Kaiju

export interface ShortcutDefinition {
  id: string;
  key: string;
  modifiers?: {
    alt?: boolean;
    ctrl?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  labelKey: string;
  category: 'pitch' | 'playback' | 'loop' | 'system';
  descriptionKey: string;
  safeWithYouTube: boolean;
}

export const SHORTCUT_REGISTRY: ShortcutDefinition[] = [
  {
    id: 'pitch-down',
    key: '[',
    labelKey: 'shortcutPitchDown',
    category: 'pitch',
    descriptionKey: 'shortcutPitchDownDesc',
    safeWithYouTube: true,
  },
  {
    id: 'pitch-up',
    key: ']',
    labelKey: 'shortcutPitchUp',
    category: 'pitch',
    descriptionKey: 'shortcutPitchUpDesc',
    safeWithYouTube: true,
  },
  {
    id: 'pitch-reset',
    key: '\\',
    labelKey: 'shortcutPitchReset',
    category: 'pitch',
    descriptionKey: 'shortcutPitchResetDesc',
    safeWithYouTube: true,
  },
  {
    id: 'pitch-cents-down',
    key: '[',
    modifiers: { alt: true },
    labelKey: 'shortcutCentsDown',
    category: 'pitch',
    descriptionKey: 'shortcutCentsDownDesc',
    safeWithYouTube: true,
  },
  {
    id: 'pitch-cents-up',
    key: ']',
    modifiers: { alt: true },
    labelKey: 'shortcutCentsUp',
    category: 'pitch',
    descriptionKey: 'shortcutCentsUpDesc',
    safeWithYouTube: true,
  },
  {
    id: 'loop-mark-a',
    key: 'a',
    modifiers: { alt: true },
    labelKey: 'shortcutLoopA',
    category: 'loop',
    descriptionKey: 'shortcutLoopADesc',
    safeWithYouTube: true,
  },
  {
    id: 'loop-mark-b',
    key: 'b',
    modifiers: { alt: true },
    labelKey: 'shortcutLoopB',
    category: 'loop',
    descriptionKey: 'shortcutLoopBDesc',
    safeWithYouTube: true,
  },
  {
    id: 'loop-toggle',
    key: 'l',
    modifiers: { alt: true },
    labelKey: 'shortcutLoopToggle',
    category: 'loop',
    descriptionKey: 'shortcutLoopToggleDesc',
    safeWithYouTube: true,
  },
  {
    id: 'loop-clear',
    key: 'c',
    modifiers: { alt: true },
    labelKey: 'shortcutLoopClear',
    category: 'loop',
    descriptionKey: 'shortcutLoopClearDesc',
    safeWithYouTube: true,
  },
  {
    id: 'speed-slower',
    key: '-',
    modifiers: { alt: true },
    labelKey: 'shortcutSpeedSlower',
    category: 'playback',
    descriptionKey: 'shortcutSpeedSlowerDesc',
    safeWithYouTube: true,
  },
  {
    id: 'speed-faster',
    key: '=',
    modifiers: { alt: true },
    labelKey: 'shortcutSpeedFaster',
    category: 'playback',
    descriptionKey: 'shortcutSpeedFasterDesc',
    safeWithYouTube: true,
  },
];

export interface KeyboardEventLike {
  key: string;
  code?: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  target?: unknown;
}

export function isTargetEditable(target: unknown): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as { isContentEditable?: boolean; matches?: (sel: string) => boolean };
  if (el.isContentEditable) return true;
  if (typeof el.matches === 'function') {
    return el.matches('input, select, textarea, [contenteditable="true"]');
  }
  return false;
}

export type ShortcutAction =
  | { type: 'PITCH_DELTA'; semitones: number }
  | { type: 'PITCH_RESET' }
  | { type: 'CENTS_DELTA'; cents: number }
  | { type: 'LOOP_ACTION'; action: 'set-a' | 'set-b' | 'toggle' | 'clear' }
  | { type: 'SPEED_DELTA'; delta: number }
  | { type: 'PLAYBACK_TOGGLE' }
  | { type: 'LYRICS_CONVERT_CHINESE' }
  | { type: 'SEEK_DELTA'; seconds: number };

export function matchKeyboardShortcut(
  event: KeyboardEventLike,
  options?: { seekInterval?: number; panelFocused?: boolean },
): ShortcutAction | null {
  if (isTargetEditable(event.target)) return null;

  const key = event.key.toLowerCase();
  const alt = Boolean(event.altKey);
  const shift = Boolean(event.shiftKey);
  const ctrl = Boolean(event.ctrlKey || event.metaKey);

  // 1. Direct key transpose: '[' and ']' without alt
  if (!alt && !ctrl && !shift) {
    if (event.key === '[') return { type: 'PITCH_DELTA', semitones: -1 };
    if (event.key === ']') return { type: 'PITCH_DELTA', semitones: 1 };
    if (event.key === '\\') return { type: 'PITCH_RESET' };
  }

  // 2. Alt-modified pitch cents & speed & loop & Chinese toggle
  if (alt && !ctrl) {
    if (event.key === '[') return { type: 'CENTS_DELTA', cents: -5 };
    if (event.key === ']') return { type: 'CENTS_DELTA', cents: 5 };
    if (key === 'a') return { type: 'LOOP_ACTION', action: 'set-a' };
    if (key === 'b') return { type: 'LOOP_ACTION', action: 'set-b' };
    if (key === 'l') return { type: 'LOOP_ACTION', action: 'toggle' };
    if (key === 'c') return { type: 'LOOP_ACTION', action: 'clear' };
    if (key === 't') return { type: 'LYRICS_CONVERT_CHINESE' };
    if (event.key === '-' || event.key === '_') return { type: 'SPEED_DELTA', delta: -0.05 };
    if (event.key === '=' || event.key === '+') return { type: 'SPEED_DELTA', delta: 0.05 };
  }

  // 3. Side-panel focused shortcuts (Space, Arrows)
  if (options?.panelFocused && !alt && !ctrl) {
    if (event.code === 'Space' || event.key === ' ') {
      return { type: 'PLAYBACK_TOGGLE' };
    }
    if (event.key === 'ArrowUp') {
      return { type: 'PITCH_DELTA', semitones: 1 };
    }
    if (event.key === 'ArrowDown') {
      return { type: 'PITCH_DELTA', semitones: -1 };
    }
    if (event.key === 'ArrowLeft') {
      return { type: 'SEEK_DELTA', seconds: -(options?.seekInterval ?? 5) };
    }
    if (event.key === 'ArrowRight') {
      return { type: 'SEEK_DELTA', seconds: options?.seekInterval ?? 5 };
    }
  }

  return null;
}
