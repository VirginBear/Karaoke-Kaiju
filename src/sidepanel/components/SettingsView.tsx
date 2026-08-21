import {
  AudioLines,
  ChevronRight,
  CircleUserRound,
  Cloud,
  Gauge,
  HardDrive,
  Info,
  Keyboard,
  Languages,
  LayoutList,
  ListRestart,
  LoaderCircle,
  Moon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
} from 'lucide-react';
import { APP_LOCALES, useI18n } from '../i18n';
import type { PlaylistSyncState } from '../usePlaylistLibrary';
import type { GoogleDriveSyncState } from '../useGoogleDriveSync';
import type { AppPreferences, ButtonSize, PracticeModule } from '../usePreferences';
import type { AppTheme } from './HeaderStatus';
import { RELEASE_POLICY } from '../../shared/release-channel';

interface SettingsViewProps {
  theme: AppTheme;
  preferences: AppPreferences;
  formantStrength: number;
  playlistSync: PlaylistSyncState;
  driveSync: GoogleDriveSyncState;
  onThemeChange: (theme: AppTheme) => void;
  onPreferencesChange: (patch: Partial<AppPreferences>) => void;
  onModuleChange: (module: PracticeModule, enabled: boolean) => void;
  onAudioQualityChange: (formantStrength: number) => void;
  onPlaylistSyncChange: (enabled: boolean) => Promise<boolean>;
  onRefreshGoogleAccount: () => Promise<void>;
  onDriveSyncChange: (enabled: boolean) => Promise<boolean>;
  onDriveSyncNow: () => Promise<boolean>;
  onDeleteDriveBackup: () => Promise<boolean>;
  onClearHistory: () => void;
  onResetSettings: () => void;
}

export function SettingsView({
  theme,
  preferences,
  formantStrength,
  playlistSync,
  driveSync,
  onThemeChange,
  onPreferencesChange,
  onModuleChange,
  onAudioQualityChange,
  onPlaylistSyncChange,
  onRefreshGoogleAccount,
  onDriveSyncChange,
  onDriveSyncNow,
  onDeleteDriveBackup,
  onClearHistory,
  onResetSettings,
}: SettingsViewProps) {
  const { t } = useI18n();
  const naturalVoice = formantStrength >= 0.5;

  return (
    <main className="settings-view">
      <SettingsSection title={t('settingsAccountSync')}>
        {RELEASE_POLICY.googleDrive ? (
        <details className="settings-disclosure" open>
          <summary className="settings-row">
            <span className="settings-leading-icon settings-leading-icon--drive"><HardDrive size={19} /></span>
            <span className="settings-copy">
              <strong>{t('googleDriveSyncTitle')}</strong>
              <small>{driveSync.configured ? t('googleDrivePrivateFolder') : t('googleDriveDeveloperHelp')}</small>
            </span>
            <span className={`settings-value ${driveSync.enabled ? 'settings-value--success' : ''}`}>{getDriveSyncStatusLabel(driveSync, t)}</span>
            <ChevronRight className="disclosure-chevron" size={18} />
          </summary>
          <div className="settings-detail-copy settings-detail-copy--stacked">
            <div className="settings-detail-line"><ShieldCheck size={17} /><p>{t('googleDriveSyncDescription')}</p></div>
            <div className="settings-detail-line"><Info size={17} /><p>{t('googleDriveMigrationNote')}</p></div>
            {driveSync.error ? <p className="settings-inline-error" role="status">{driveSync.error}</p> : null}
            {driveSync.backupDeleted ? <p className="settings-inline-success" role="status">{t('googleDriveBackupDeleted')}</p> : null}
            <div className="sync-actions">
              <button
                type="button"
                className={driveSync.enabled ? 'sync-button sync-button--stop' : 'sync-button'}
                disabled={!driveSync.configured || driveSync.phase === 'syncing' || driveSync.phase === 'authorizing'}
                onClick={() => void onDriveSyncChange(!driveSync.enabled)}
              >
                {driveSync.phase === 'syncing' || driveSync.phase === 'authorizing' ? <LoaderCircle className="spin" size={16} /> : <Cloud size={16} />}
                {!driveSync.configured ? t('googleDriveSetupRequired') : driveSync.enabled ? t('googleDriveDisconnect') : t('googleDriveConnect')}
              </button>
              <button type="button" className="sync-refresh" disabled={!driveSync.enabled || driveSync.phase !== 'idle'} onClick={() => void onDriveSyncNow()} aria-label={t('googleDriveSyncNow')}><RefreshCw size={16} /></button>
            </div>
            {driveSync.lastSyncedAt !== null ? <small className="sync-usage">{t('googleDriveLastSync', { time: new Date(driveSync.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}</small> : null}
            <button
              type="button"
              className="drive-delete-button"
              disabled={!driveSync.configured || driveSync.phase === 'syncing' || driveSync.phase === 'authorizing'}
              onClick={() => { if (window.confirm(t('googleDriveDeleteConfirm'))) void onDeleteDriveBackup(); }}
            >
              <Trash2 size={15} />{t('googleDriveDeleteBackup')}
            </button>
          </div>
        </details>
        ) : null}
        <details className="settings-disclosure">
          <summary className="settings-row">
            <span className="settings-leading-icon settings-leading-icon--drive"><CircleUserRound size={19} /></span>
            <span className="settings-copy"><strong>{t('chromeSyncTitle')}</strong><small>{getSyncSubtitle(playlistSync, t)}</small></span>
            <span className={`settings-value ${playlistSync.enabled ? 'settings-value--success' : ''}`}>{getSyncStatusLabel(playlistSync, t)}</span>
            <ChevronRight className="disclosure-chevron" size={18} />
          </summary>
          <div className="settings-detail-copy settings-detail-copy--stacked">
            <div className="settings-detail-line"><HardDrive size={17} /><p>{t('chromeSyncDescription')}</p></div>
            {playlistSync.error ? <p className="settings-inline-error" role="status">{playlistSync.error}</p> : null}
            <div className="sync-actions">
              <button type="button" className={playlistSync.enabled ? 'sync-button sync-button--stop' : 'sync-button'} disabled={playlistSync.phase === 'syncing'} onClick={() => void onPlaylistSyncChange(!playlistSync.enabled)}>
                {playlistSync.phase === 'syncing' ? <LoaderCircle className="spin" size={16} /> : <Cloud size={16} />}
                {playlistSync.enabled ? t('stopPlaylistSync') : t('linkGoogleAccount')}
              </button>
              <button type="button" className="sync-refresh" onClick={() => void onRefreshGoogleAccount()} aria-label={t('refreshGoogleAccount')}><RefreshCw size={16} /></button>
            </div>
            {playlistSync.bytesInUse !== null ? <small className="sync-usage">{t('syncUsage', { used: (playlistSync.bytesInUse / 1024).toFixed(1) })}</small> : null}
          </div>
        </details>
      </SettingsSection>

      <SettingsSection title={t('settingsAppearance')}>
        <SettingControlRow icon={theme === 'light' ? <Sun size={18} /> : <Moon size={18} />} label={t('settingsTheme')}>
          <SegmentedControl label={t('settingsTheme')} value={theme} options={[{ value: 'light', label: t('themeLight') }, { value: 'dark', label: t('themeDark') }]} onChange={(value) => onThemeChange(value as AppTheme)} />
        </SettingControlRow>
        <SettingControlRow icon={<LayoutList size={18} />} label={t('settingsButtonSize')}>
          <SelectControl value={preferences.buttonSize} ariaLabel={t('settingsButtonSize')} onChange={(value) => onPreferencesChange({ buttonSize: value as ButtonSize })} options={[
            { value: 'compact', label: t('buttonCompact') }, { value: 'standard', label: t('buttonStandard') }, { value: 'large', label: t('buttonLarge') },
          ]} />
        </SettingControlRow>
        <SettingControlRow icon={<Languages size={18} />} label={t('settingsLanguage')} description={t('settingsLanguageHelp')}>
          <SelectControl value={preferences.locale} ariaLabel={t('settingsLanguage')} onChange={(value) => onPreferencesChange({ locale: value as AppPreferences['locale'] })} options={APP_LOCALES} />
        </SettingControlRow>
        <SettingControlRow icon={<Languages size={18} />} label={t('terminology')} description={t('terminologyDescription')}>
          <SelectControl value={preferences.terminologyLocale} ariaLabel={t('terminology')} onChange={(value) => onPreferencesChange({ terminologyLocale: value as AppPreferences['terminologyLocale'] })} options={APP_LOCALES} />
        </SettingControlRow>
        <SettingControlRow icon={<Languages size={18} />} label={t('lyricsScriptPreference')} description={t('lyricsScriptPreferenceDescription')}>
          <SelectControl
            value={preferences.lyricsScriptPreference ?? 'traditional'}
            ariaLabel={t('lyricsScriptPreference')}
            onChange={(value) => onPreferencesChange({ lyricsScriptPreference: value as AppPreferences['lyricsScriptPreference'] })}
            options={[
              { value: 'traditional', label: t('lyricsScriptTraditional') },
              { value: 'simplified', label: t('lyricsScriptSimplified') },
              { value: 'original', label: t('lyricsScriptOriginal') },
            ]}
          />
        </SettingControlRow>
      </SettingsSection>

      <SettingsSection title={t('settingsPlayback')}>
        <ToggleRow icon={<RefreshCw size={18} />} label={t('autoSaveHistory')} description={t('autoSaveHistoryDescription')} checked={preferences.autoSaveHistory} onChange={(autoSaveHistory) => onPreferencesChange({ autoSaveHistory })} />
        <ToggleRow icon={<RotateCcw size={18} />} label={t('autoReset')} description={t('autoResetDescription')} checked={preferences.autoResetOnTrackChange} onChange={(autoResetOnTrackChange) => onPreferencesChange({ autoResetOnTrackChange })} />
        <ToggleRow icon={<HardDrive size={18} />} label={t('rememberSettings')} description={t('rememberSettingsDescription')} checked={preferences.rememberLastSettings} onChange={(rememberLastSettings) => onPreferencesChange({ rememberLastSettings })} />
        <ToggleRow icon={<Gauge size={18} />} label={t('wheelControl')} description={t('wheelControlDescription')} checked={preferences.wheelControl} onChange={(wheelControl) => onPreferencesChange({ wheelControl })} />
        <SettingControlRow icon={<Gauge size={18} />} label={t('seekInterval')}>
          <SelectControl value={String(preferences.seekInterval)} ariaLabel={t('seekInterval')} onChange={(value) => onPreferencesChange({ seekInterval: Number(value) as AppPreferences['seekInterval'] })} options={[5, 10, 15].map((value) => ({ value: String(value), label: t('seconds', { value }) }))} />
        </SettingControlRow>
      </SettingsSection>

      <SettingsSection title={t('settingsAudio')}>
        <div className="settings-row settings-row--stacked">
          <div className="settings-row-title"><span className="settings-leading-icon"><SlidersHorizontal size={18} /></span><span>{t('audioQuality')}</span></div>
          <SegmentedControl label={t('audioQuality')} value={naturalVoice ? 'natural' : 'standard'} options={[{ value: 'standard', label: t('standard') }, { value: 'natural', label: t('naturalVoice') }]} onChange={(value) => onAudioQualityChange(value === 'natural' ? 1 : 0)} />
          <p>{t('naturalVoiceDescription')}</p>
        </div>
        {RELEASE_POLICY.varispeed ? <ToggleRow icon={<Gauge size={18} />} label={t('varispeed')} description={t('varispeedDescription')} checked={preferences.varispeed} onChange={(varispeed) => onPreferencesChange({ varispeed })} /> : null}
        <SettingControlRow icon={<AudioLines size={18} />} label={t('pitchDisplay')}>
          <SegmentedControl label={t('pitchDisplay')} value={preferences.pitchDisplay} options={[{ value: 'cents', label: 'Cents' }, { value: 'hz', label: 'Hz' }]} onChange={(value) => onPreferencesChange({ pitchDisplay: value as AppPreferences['pitchDisplay'] })} />
        </SettingControlRow>
        <SettingControlRow icon={<SlidersHorizontal size={18} />} label={t('keyRange')} description={t(RELEASE_POLICY.extendedKeyRange ? 'extendedRangeDescription' : 'publicKeyRangeDescription')}>
          <SelectControl value={String(Math.min(preferences.keyRange, 12))} ariaLabel={t('keyRange')} onChange={(value) => onPreferencesChange({ keyRange: Number(value) as AppPreferences['keyRange'] })} options={RELEASE_POLICY.extendedKeyRange ? [{ value: '6', label: '±6' }, { value: '12', label: '±12' }, { value: '24', label: '±24' }, { value: '36', label: '±36' }] : [{ value: '6', label: '±6' }, { value: '12', label: '±12' }]} />
        </SettingControlRow>
        <SettingControlRow icon={<AudioLines size={18} />} label={t('referenceTuning')}>
          <SelectControl value={String(preferences.referenceTuning)} ariaLabel={t('referenceTuning')} onChange={(value) => onPreferencesChange({ referenceTuning: Number(value) as AppPreferences['referenceTuning'] })} options={[432, 440, 442].map((value) => ({ value: String(value), label: `${value} Hz` }))} />
        </SettingControlRow>
      </SettingsSection>

      <SettingsSection title={t('settingsLayout')}>
        {(RELEASE_POLICY.modules as PracticeModule[]).map((module) => (
          <ToggleRow key={module} icon={<LayoutList size={18} />} label={t(moduleLabel(module))} checked={preferences.modules[module]} onChange={(enabled) => onModuleChange(module, enabled)} />
        ))}
      </SettingsSection>

      <SettingsSection title={t('settingsShortcuts')}>
        <ToggleRow icon={<Keyboard size={18} />} label={t('enableShortcuts')} description={t('shortcutsDescription')} checked={preferences.shortcutsEnabled} onChange={(shortcutsEnabled) => onPreferencesChange({ shortcutsEnabled })} />
        <details className="settings-disclosure" open>
          <summary className="settings-row">
            <span className="settings-leading-icon"><Keyboard size={18} /></span><span className="settings-copy"><strong>{t('shortcutMappings')}</strong></span><ChevronRight className="disclosure-chevron" size={18} />
          </summary>
          <div className="shortcut-list">
            <span><kbd>[</kbd> / <kbd>]</kbd>{t('shortcutPitchDown')} / {t('shortcutPitchUp')}</span>
            <span><kbd>\</kbd>{t('shortcutPitchReset')}</span>
            <span><kbd>Alt</kbd> + <kbd>[</kbd> / <kbd>]</kbd>{t('shortcutCentsDown')} / {t('shortcutCentsUp')}</span>
            <span><kbd>Alt</kbd> + <kbd>A</kbd> / <kbd>B</kbd>{t('shortcutLoopA')} / {t('shortcutLoopB')}</span>
            <span><kbd>Alt</kbd> + <kbd>L</kbd> / <kbd>C</kbd>{t('shortcutLoopToggle')} / {t('shortcutLoopClear')}</span>
            <span><kbd>Alt</kbd> + <kbd>-</kbd> / <kbd>=</kbd>{t('shortcutSpeedSlower')} / {t('shortcutSpeedFaster')}</span>
            <span><kbd>Space</kbd>{t('shortcutSpace')}</span>
            <span><kbd>←</kbd> / <kbd>→</kbd>{t('shortcutLeftRight')}</span>
            <span><kbd>↑</kbd> / <kbd>↓</kbd>{t('shortcutUpDown')}</span>
          </div>
          <div className="settings-detail-copy" style={{ marginTop: '8px' }}>
            <Info size={15} />
            <p>{t('shortcutConflictNotice')}</p>
          </div>
        </details>
      </SettingsSection>

      <SettingsSection title={t('settingsData')}>
        <ActionRow icon={<Trash2 size={18} />} label={t('clearHistory')} description={t('clearHistoryDescription')} actionLabel={t('clear')} onClick={() => { if (window.confirm(t('confirmClearHistory'))) onClearHistory(); }} danger />
        <ActionRow icon={<ListRestart size={18} />} label={t('resetSettings')} description={t('resetSettingsDescription')} actionLabel={t('reset')} onClick={() => { if (window.confirm(t('confirmResetSettings'))) onResetSettings(); }} />
        <details className="settings-disclosure">
          <summary className="settings-row"><span className="settings-leading-icon"><ShieldCheck size={18} /></span><span className="settings-copy"><strong>{t('privacyPermissions')}</strong><small>{t('privacyPermissionsDescription')}</small></span><ChevronRight className="disclosure-chevron" size={18} /></summary>
          <div className="settings-detail-copy"><Info size={17} /><p>{t('chromeSyncDescription')}</p></div>
        </details>
      </SettingsSection>

      <SettingsSection title={t('version')}>
        <div className="settings-row"><span className="settings-leading-icon"><Info size={19} /></span><span className="settings-copy"><strong>{t('appName')}</strong><small>{t('allFeaturesFree')}</small></span><span className="settings-value">{__APP_VERSION__}</span></div>
      </SettingsSection>
    </main>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="settings-section"><h2>{title}</h2><div className="settings-group">{children}</div></section>;
}

function SettingControlRow({ icon, label, description, children }: { icon: React.ReactNode; label: string; description?: string; children: React.ReactNode }) {
  return <div className="settings-row settings-row--control"><span className="settings-leading-icon">{icon}</span><span className="settings-copy"><strong>{label}</strong>{description ? <small>{description}</small> : null}</span>{children}</div>;
}

function ToggleRow({ icon, label, description, checked, onChange }: { icon: React.ReactNode; label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <div className="settings-row"><span className="settings-leading-icon">{icon}</span><span className="settings-copy"><strong>{label}</strong>{description ? <small>{description}</small> : null}</span><button className={`toggle-control ${checked ? 'is-on' : ''}`} type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button></div>;
}

function ActionRow({ icon, label, description, actionLabel, onClick, danger = false }: { icon: React.ReactNode; label: string; description: string; actionLabel: string; onClick: () => void; danger?: boolean }) {
  return <div className="settings-row"><span className="settings-leading-icon">{icon}</span><span className="settings-copy"><strong>{label}</strong><small>{description}</small></span><button className={`settings-action ${danger ? 'is-danger' : ''}`} type="button" onClick={onClick}>{actionLabel}</button></div>;
}

function SegmentedControl({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <div className="segmented-control" role="group" aria-label={label}>{options.map((option) => <button key={option.value} type="button" className={value === option.value ? 'is-selected' : ''} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}

function SelectControl({ value, options, onChange, ariaLabel }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; ariaLabel: string }) {
  return <select className="settings-select" value={value} aria-label={ariaLabel} onChange={(event) => onChange(event.currentTarget.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

function moduleLabel(module: PracticeModule): 'moduleKey' | 'moduleFinePitch' | 'moduleSpeed' | 'moduleLoop' | 'moduleEqualizer' | 'moduleVocalReducer' | 'moduleBpm' {
  const labels = {
    key: 'moduleKey',
    finePitch: 'moduleFinePitch',
    speed: 'moduleSpeed',
    loop: 'moduleLoop',
    equalizer: 'moduleEqualizer',
    vocalReducer: 'moduleVocalReducer',
    bpm: 'moduleBpm',
  } as const;
  return labels[module];
}

function getSyncSubtitle(sync: PlaylistSyncState, t: ReturnType<typeof useI18n>['t']): string {
  if (sync.email) return sync.email;
  return sync.status === 'signed-out' ? t('syncNotSignedIn') : t('syncCheckAccount');
}

function getSyncStatusLabel(sync: PlaylistSyncState, t: ReturnType<typeof useI18n>['t']): string {
  if (sync.phase === 'syncing') return t('syncInProgress');
  if (sync.enabled && sync.status === 'syncing') return t('syncLinked');
  if (sync.status === 'signed-in') return t('syncDisabled');
  return t('syncNotLinked');
}

function getDriveSyncStatusLabel(sync: GoogleDriveSyncState, t: ReturnType<typeof useI18n>['t']): string {
  if (!sync.configured) return t('googleDriveSetupRequired');
  if (sync.phase === 'authorizing' || sync.phase === 'syncing') return t('syncInProgress');
  if (sync.enabled) return t('googleDriveLinked');
  return t('googleDriveReady');
}
