import { useCallback, useEffect, useRef, useState } from 'react';
import { readStoredValue, writeStoredValue } from './storage';
import type { AppLocale } from './i18n';

export type ButtonSize = 'compact' | 'standard' | 'large';
export type PitchDisplay = 'cents' | 'hz';
export type PracticeModule = 'key' | 'finePitch' | 'speed' | 'loop' | 'equalizer' | 'vocalReducer' | 'bpm';
export type AudioEngineQuality = 'standard' | 'low-latency' | 'hq-natural';

export interface AppPreferences {
  schemaVersion: 2;
  buttonSize: ButtonSize;
  locale: AppLocale;
  terminologyLocale: AppLocale;
  autoSaveHistory: boolean;
  autoResetOnTrackChange: boolean;
  rememberLastSettings: boolean;
  wheelControl: boolean;
  varispeed: boolean;
  seekInterval: 5 | 10 | 15;
  scrubDurationMs: number;
  pitchDisplay: PitchDisplay;
  keyRange: 6 | 12 | 24 | 36;
  referenceTuning: 432 | 440 | 442;
  shortcutsEnabled: boolean;
  audioEngineQuality: AudioEngineQuality;
  vocalReduction: number;
  vocalMix: { musicVolume: number; vocalVolume: number };
  equalizer: { low: number; mid: number; high: number };
  lyricsScriptPreference?: 'original' | 'traditional' | 'simplified';
  modules: Record<PracticeModule, boolean>;
}

const PREFERENCES_KEY = 'appPreferencesV2';
const LEGACY_BUTTON_SIZE_KEY = 'buttonSize';

export const DEFAULT_PREFERENCES: AppPreferences = {
  schemaVersion: 2,
  buttonSize: 'standard',
  locale: 'zh-TW',
  terminologyLocale: 'zh-TW',
  lyricsScriptPreference: 'traditional',
  autoSaveHistory: true,
  autoResetOnTrackChange: false,
  rememberLastSettings: true,
  wheelControl: false,
  varispeed: false,
  seekInterval: 5,
  scrubDurationMs: 50,
  pitchDisplay: 'cents',
  keyRange: 12,
  referenceTuning: 440,
  shortcutsEnabled: true,
  audioEngineQuality: 'hq-natural',
  vocalReduction: 0,
  vocalMix: { musicVolume: 1.0, vocalVolume: 1.0 },
  equalizer: { low: 0, mid: 0, high: 0 },
  modules: {
    key: true,
    finePitch: true,
    speed: true,
    loop: true,
    equalizer: true,
    vocalReducer: true,
    bpm: true,
  },
};

function normalizePreferences(stored: Partial<AppPreferences>): AppPreferences {
  const locale = ['zh-TW', 'en', 'ja', 'zh-CN'].includes(stored.locale ?? '')
    ? (stored.locale as AppLocale)
    : DEFAULT_PREFERENCES.locale;
  const terminologyLocale = ['zh-TW', 'en', 'ja', 'zh-CN'].includes(stored.terminologyLocale ?? '')
    ? (stored.terminologyLocale as AppLocale)
    : locale;
  const buttonSize = ['compact', 'standard', 'large'].includes(stored.buttonSize ?? '')
    ? (stored.buttonSize as ButtonSize)
    : DEFAULT_PREFERENCES.buttonSize;
  const seekInterval = [5, 10, 15].includes(stored.seekInterval ?? 0)
    ? (stored.seekInterval as 5 | 10 | 15)
    : DEFAULT_PREFERENCES.seekInterval;
  const referenceTuning = [432, 440, 442].includes(stored.referenceTuning ?? 0)
    ? (stored.referenceTuning as 432 | 440 | 442)
    : DEFAULT_PREFERENCES.referenceTuning;
  const keyRange = [6, 12, 24, 36].includes(stored.keyRange ?? 0)
    ? (stored.keyRange as 6 | 12 | 24 | 36)
    : DEFAULT_PREFERENCES.keyRange;
  const audioEngineQuality = ['standard', 'low-latency', 'hq-natural'].includes(stored.audioEngineQuality ?? '')
    ? (stored.audioEngineQuality as AudioEngineQuality)
    : DEFAULT_PREFERENCES.audioEngineQuality;

  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
    schemaVersion: 2,
    locale,
    terminologyLocale,
    buttonSize,
    seekInterval,
    referenceTuning,
    keyRange,
    audioEngineQuality,
    pitchDisplay: stored.pitchDisplay === 'hz' ? 'hz' : 'cents',
    modules: {
      ...DEFAULT_PREFERENCES.modules,
      ...stored.modules,
    },
    equalizer: {
      low: Math.max(-12, Math.min(12, stored.equalizer?.low ?? 0)),
      mid: Math.max(-12, Math.min(12, stored.equalizer?.mid ?? 0)),
      high: Math.max(-12, Math.min(12, stored.equalizer?.high ?? 0)),
    },
    vocalMix: {
      musicVolume: Math.max(0, Math.min(2, stored.vocalMix?.musicVolume ?? 1.0)),
      vocalVolume: Math.max(0, Math.min(2, stored.vocalMix?.vocalVolume ?? 1.0)),
    },
  };
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const preferencesRef = useRef(preferences);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      readStoredValue<Partial<AppPreferences>>(PREFERENCES_KEY, DEFAULT_PREFERENCES),
      readStoredValue<ButtonSize>(LEGACY_BUTTON_SIZE_KEY, DEFAULT_PREFERENCES.buttonSize),
    ]).then(([stored, legacyButtonSize]) => {
      if (cancelled) {
        return;
      }
      const resolved = normalizePreferences({
        ...stored,
        buttonSize: stored.buttonSize ?? legacyButtonSize,
      });
      preferencesRef.current = resolved;
      setPreferences(resolved);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: AppPreferences) => {
    preferencesRef.current = next;
    setPreferences(next);
    void writeStoredValue(PREFERENCES_KEY, next);
  }, []);

  const updatePreferences = useCallback((patch: Partial<AppPreferences>) => {
    commit(normalizePreferences({ ...preferencesRef.current, ...patch }));
  }, [commit]);

  const setModuleEnabled = useCallback((module: PracticeModule, enabled: boolean) => {
    commit({
      ...preferencesRef.current,
      modules: { ...preferencesRef.current.modules, [module]: enabled },
    });
  }, [commit]);

  const resetPreferences = useCallback(() => {
    commit(DEFAULT_PREFERENCES);
  }, [commit]);

  return {
    preferences,
    loaded,
    updatePreferences,
    setModuleEnabled,
    resetPreferences,
    setButtonSize: (buttonSize: ButtonSize) => updatePreferences({ buttonSize }),
    setLocale: (locale: AppLocale) => updatePreferences({ locale }),
  };
}
