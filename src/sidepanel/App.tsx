import { Activity, AlertCircle, AudioLines, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BottomNavigation, type AppTab } from './components/BottomNavigation';
import { CollapsibleSection } from './components/CollapsibleSection';
import { FinePitchControl } from './components/FinePitchControl';
import { HeaderStatus } from './components/HeaderStatus';
import { KeyControl } from './components/KeyControl';
import { LoopControl } from './components/LoopControl';
import { EqualizerSection } from './components/EqualizerSection';
import { VocalReducerSection } from './components/VocalReducerSection';
import { BpmSection } from './components/BpmSection';
import { LyricsView } from './components/LyricsView';
import { MediaSummary } from './components/MediaSummary';
import { PlaylistsView } from './components/PlaylistsView';
import { RecentView } from './components/RecentView';
import { SettingsView } from './components/SettingsView';
import { SpeedControl } from './components/SpeedControl';
import { TransportControls } from './components/TransportControls';
import { I18nProvider, useI18n } from './i18n';
import { useExtensionController } from './useExtensionController';
import { useLyricsLibrary } from './useLyricsLibrary';
import { useGoogleDriveSync } from './useGoogleDriveSync';
import { usePlaylistLibrary } from './usePlaylistLibrary';
import { usePracticeSequence } from './usePracticeSequence';
import { usePreferences } from './usePreferences';
import { useRecentHistory } from './useRecentHistory';
import { useTheme } from './useTheme';
import { matchKeyboardShortcut } from '../shared/shortcuts';
import { detectChineseVariant } from '../shared/chinese-convert';
import { RELEASE_CHANNEL, RELEASE_POLICY } from '../shared/release-channel';

export function App() {
  const preferenceApi = usePreferences();
  return (
    <I18nProvider locale={preferenceApi.preferences.locale}>
      <AppContent preferenceApi={preferenceApi} />
    </I18nProvider>
  );
}

function AppContent({ preferenceApi }: { preferenceApi: ReturnType<typeof usePreferences> }) {
  const { t } = useI18n();
  const [selectedTab, setSelectedTab] = useState<AppTab>('practice');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const controller = useExtensionController();
  const { runMediaCommand, setLyricsOverlay, setPitch } = controller;
  const { theme, setTheme } = useTheme();
  const playlists = usePlaylistLibrary();
  const { preferences, updatePreferences, setModuleEnabled, resetPreferences } = preferenceApi;
  const { audio, media } = controller.state;
  const practiceSequence = usePracticeSequence({ media, runMediaCommand });
  const recent = useRecentHistory(media, audio, preferences.autoSaveHistory);
  const lyrics = useLyricsLibrary(media, playlists.sync.enabled);
  const driveSync = useGoogleDriveSync({
    loaded: playlists.loaded && lyrics.loaded,
    playlists: playlists.library,
    lyrics: lyrics.library,
    replacePlaylists: playlists.replaceLibrary,
    replaceLyrics: lyrics.replaceLibrary,
  });
  const keyNeedsToolbarInvocation = audio.status === 'error' && Boolean(audio.error?.includes('Chrome 工具列'));

  const updatePreference = useCallback((patch: Parameters<typeof updatePreferences>[0]) => {
    updatePreferences(patch);
    if (patch.keyRange === 6 && Math.abs(audio.pitchSemitones) > 6) {
      void setPitch(Math.sign(audio.pitchSemitones) * 6, audio.pitchCents);
    }
  }, [audio.pitchCents, audio.pitchSemitones, setPitch, updatePreferences]);

  useEffect(() => {
    if (!preferences.shortcutsEnabled || settingsOpen) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = matchKeyboardShortcut(event, {
        seekInterval: preferences.seekInterval,
        panelFocused: selectedTab === 'practice',
      });
      if (!action) return;

      event.preventDefault();
      if (action.type === 'PITCH_DELTA') {
        const next = Math.max(
          -preferences.keyRange,
          Math.min(preferences.keyRange, audio.pitchSemitones + action.semitones),
        );
        void setPitch(next, audio.pitchCents);
      } else if (action.type === 'PITCH_RESET') {
        void setPitch(0, 0);
      } else if (action.type === 'CENTS_DELTA') {
        const next = Math.max(-100, Math.min(100, audio.pitchCents + action.cents));
        void setPitch(audio.pitchSemitones, next);
      } else if (action.type === 'SPEED_DELTA') {
        const currentSpeed = media.playbackRate || 1.0;
        const nextSpeed = Math.max(0.25, Math.min(4.0, Math.round((currentSpeed + action.delta) * 100) / 100));
        void runMediaCommand({ kind: 'SET_SPEED', speed: nextSpeed });
      } else if (action.type === 'PLAYBACK_TOGGLE') {
        void runMediaCommand({ kind: 'TOGGLE_PLAYBACK' });
      } else if (action.type === 'SEEK_DELTA') {
        void runMediaCommand({ kind: 'SEEK_RELATIVE', seconds: action.seconds });
      } else if (action.type === 'LOOP_ACTION') {
        if (action.action === 'set-a') {
          void runMediaCommand({ kind: 'SET_LOOP_POINT', point: 'start' });
        } else if (action.action === 'set-b') {
          void runMediaCommand({ kind: 'SET_LOOP_POINT', point: 'end' });
        } else if (action.action === 'toggle') {
          void runMediaCommand({ kind: 'TOGGLE_LOOP' });
        } else if (action.action === 'clear') {
          void runMediaCommand({ kind: 'CLEAR_LOOP' });
        }
      } else if (action.type === 'LYRICS_CONVERT_CHINESE') {
        if (lyrics.current && lyrics.current.lines.length) {
          const firstLine = lyrics.current.lines[0]?.text || '';
          const variant = detectChineseVariant(firstLine);
          const target = variant === 'simplified' ? 'traditional' : 'simplified';
          lyrics.convertChinese(target);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    audio.pitchCents,
    audio.pitchSemitones,
    lyrics,
    media.currentTime,
    media.playbackRate,
    preferences.keyRange,
    preferences.seekInterval,
    preferences.shortcutsEnabled,
    runMediaCommand,
    selectedTab,
    setPitch,
    settingsOpen,
  ]);

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: 0 });
  }, [selectedTab, settingsOpen]);

  useEffect(() => {
    if (!lyrics.loaded || !media.available) {
      return;
    }
    void setLyricsOverlay(lyrics.current ? {
      title: lyrics.current.title,
      visible: lyrics.current.visible,
      offsetMs: lyrics.current.offsetMs,
      fontScale: lyrics.current.fontScale,
      panelOpacity: lyrics.current.panelOpacity,
      verticalOffset: lyrics.current.verticalOffset,
      leadTimeSeconds: lyrics.current.leadTimeSeconds,
      lines: lyrics.current.lines,
    } : null);
  }, [lyrics.current, lyrics.loaded, media.available, setLyricsOverlay]);

  return (
    <div className="app-shell" data-theme={theme} data-button-size={preferences.buttonSize} data-release-channel={RELEASE_CHANNEL} lang={preferences.locale}>
      <HeaderStatus
        connected={media.available}
        processing={audio.status === 'active'}
        settingsOpen={settingsOpen}
        onOpenSettings={() => setSettingsOpen(true)}
        onCloseSettings={() => setSettingsOpen(false)}
      />
      <div className="app-scroll-area" ref={scrollAreaRef}>
        {settingsOpen ? (
          <SettingsView
            theme={theme}
            preferences={preferences}
            formantStrength={audio.formantStrength}
            playlistSync={playlists.sync}
            driveSync={driveSync.state}
            onThemeChange={setTheme}
            onPreferencesChange={updatePreference}
            onModuleChange={setModuleEnabled}
            onAudioQualityChange={(formantStrength) => void controller.setAudioQuality(formantStrength)}
            onPlaylistSyncChange={playlists.setSyncEnabled}
            onRefreshGoogleAccount={playlists.refreshAccount}
            onDriveSyncChange={driveSync.setEnabled}
            onDriveSyncNow={driveSync.syncNow}
            onDeleteDriveBackup={driveSync.deleteBackup}
            onClearHistory={recent.clearHistory}
            onResetSettings={() => { resetPreferences(); setTheme('light'); }}
          />
        ) : (
          <>
            {selectedTab === 'practice' ? (
              <MediaSummary
                audio={audio}
                media={media}
                busy={controller.busy}
                detecting={controller.detecting}
                detectionError={controller.state.mediaError}
                onStart={() => void controller.startAudio()}
                onStop={() => void controller.stopAudio()}
                onOpen={() => void controller.openMediaTab()}
                onRetry={() => void controller.retryDetection()}
              />
            ) : null}

            {controller.error || audio.error ? (
              <div className="status-message status-message--error" role="status">
                <AlertCircle size={17} />
                <span>{controller.error ?? audio.error}</span>
                <button type="button" onClick={controller.clearError} aria-label={t('dismissError')}><X size={16} /></button>
              </div>
            ) : null}

            {selectedTab === 'practice' ? (
              <main className="practice-view">
                {preferences.modules.key ? (
                  <KeyControl
                    semitones={audio.pitchSemitones}
                    maxRange={RELEASE_POLICY.extendedKeyRange ? preferences.keyRange : Math.min(preferences.keyRange, 12) as 6 | 12}
                    disabled={!media.available || keyNeedsToolbarInvocation}
                    wheelControl={preferences.wheelControl}
                    varispeed={RELEASE_POLICY.varispeed && preferences.varispeed}
                    onChange={(semitones) => void controller.setPitch(semitones, audio.pitchCents)}
                  />
                ) : null}
                {preferences.modules.finePitch ? (
                  <CollapsibleSection
                    id="finePitch"
                    title="音高微調 (Fine Pitch)"
                    icon={<Sparkles size={16} />}
                    badge={audio.pitchCents !== 0 ? `${audio.pitchCents > 0 ? '+' : ''}${audio.pitchCents} cents` : undefined}
                    defaultOpen={false}
                  >
                    <FinePitchControl
                      semitones={audio.pitchSemitones}
                      cents={audio.pitchCents}
                      display={preferences.pitchDisplay}
                      referenceTuning={preferences.referenceTuning}
                      disabled={!media.available || keyNeedsToolbarInvocation}
                      wheelControl={preferences.wheelControl}
                      onChange={(cents) => void controller.setPitch(audio.pitchSemitones, cents)}
                    />
                  </CollapsibleSection>
                ) : null}
                {preferences.modules.speed ? (
                  <SpeedControl
                    speed={media.playbackRate}
                    disabled={!media.available}
                    wheelControl={preferences.wheelControl}
                    onChange={(speed) => void controller.runMediaCommand({ kind: 'SET_SPEED', speed })}
                  />
                ) : null}
                {preferences.modules.loop ? (
                  <LoopControl
                    loop={media.loop}
                    duration={media.duration}
                    disabled={!media.available}
                    onSetPoint={(point) => void controller.runMediaCommand({ kind: 'SET_LOOP_POINT', point })}
                    onToggle={() => void controller.runMediaCommand({ kind: 'TOGGLE_LOOP' })}
                    onClear={() => void controller.runMediaCommand({ kind: 'CLEAR_LOOP' })}
                    onSelectClip={(clip) => void controller.runMediaCommand({ kind: 'SET_LOOP_CLIP', clip })}
                    onSaveClip={(name) => void controller.runMediaCommand({ kind: 'SAVE_CURRENT_CLIP', name })}
                    onDeleteClip={(clipId) => void controller.runMediaCommand({ kind: 'DELETE_LOOP_CLIP', clipId })}
                    sequence={practiceSequence.sequence}
                    sequenceError={practiceSequence.error}
                    onStartSequence={(steps) => void practiceSequence.startSequence(steps)}
                    onCancelSequence={() => void practiceSequence.cancelSequence()}
                  />
                ) : null}
                {RELEASE_POLICY.modules.includes('vocalReducer') && preferences.modules.vocalReducer ? (
                  <CollapsibleSection
                    id="vocalReducer"
                    title="人聲消除／伴奏提取"
                    icon={<AudioLines size={16} />}
                    badge={
                      preferences.vocalMix.musicVolume !== 1.0 || preferences.vocalMix.vocalVolume !== 1.0
                        ? `${Math.round(preferences.vocalMix.musicVolume * 100)}/${Math.round(preferences.vocalMix.vocalVolume * 100)}%`
                        : undefined
                    }
                    defaultOpen={false}
                  >
                    <VocalReducerSection
                      mix={preferences.vocalMix}
                      disabled={!media.available}
                      wheelControl={preferences.wheelControl}
                      onChange={(mix) => {
                        updatePreference({ vocalMix: mix });
                        void controller.setVocalMix(mix.musicVolume, mix.vocalVolume);
                      }}
                    />
                  </CollapsibleSection>
                ) : null}
                {RELEASE_POLICY.modules.includes('equalizer') && preferences.modules.equalizer ? (
                  <CollapsibleSection
                    id="equalizer"
                    title="3 段等化器 (EQ)"
                    icon={<SlidersHorizontal size={16} />}
                    badge={
                      preferences.equalizer.low !== 0 || preferences.equalizer.mid !== 0 || preferences.equalizer.high !== 0
                        ? '自訂'
                        : undefined
                    }
                    defaultOpen={false}
                  >
                    <EqualizerSection
                      equalizer={preferences.equalizer}
                      disabled={!media.available}
                      wheelControl={preferences.wheelControl}
                      onChange={(eq) => {
                        updatePreference({ equalizer: eq });
                        void controller.setEqualizer(eq.low, eq.mid, eq.high);
                      }}
                    />
                  </CollapsibleSection>
                ) : null}
                {RELEASE_POLICY.modules.includes('bpm') && preferences.modules.bpm ? (
                  <CollapsibleSection
                    id="bpm"
                    title="BPM 節奏與節拍器"
                    icon={<Activity size={16} />}
                    defaultOpen={false}
                  >
                    <BpmSection disabled={!media.available || audio.status !== 'active'} onAutoDetect={controller.analyzeBpm} />
                  </CollapsibleSection>
                ) : null}
                <TransportControls
                  currentTime={media.currentTime}
                  duration={media.duration}
                  paused={media.paused}
                  disabled={!media.available}
                  seekInterval={preferences.seekInterval}
                  previousDisabled={controller.busy || controller.state.queue.status === 'idle' || controller.state.queue.index <= 0}
                  nextDisabled={controller.busy || controller.state.queue.status === 'idle' || controller.state.queue.index >= controller.state.queue.total - 1}
                  onTogglePlayback={() => void controller.runMediaCommand({ kind: 'TOGGLE_PLAYBACK' })}
                  onSeek={(seconds) => void controller.runMediaCommand({ kind: 'SEEK_RELATIVE', seconds })}
                  onPrevious={() => void controller.skipPlaylistTrack('previous')}
                  onNext={() => void controller.skipPlaylistTrack('next')}
                />
              </main>
            ) : selectedTab === 'recent' ? (
              <RecentView
                tracks={recent.history.tracks}
                loaded={recent.loaded}
                library={playlists.library}
                busy={controller.busy}
                onPlay={(track) => void controller.playRecentTrack(track)}
                onRemove={recent.removeTrack}
                onCreatePlaylist={playlists.addPlaylist}
                onAddTrack={playlists.addSavedTrack}
              />
            ) : selectedTab === 'playlists' ? (
              <PlaylistsView
                library={playlists.library}
                loaded={playlists.loaded}
                media={media}
                audio={audio}
                queue={controller.state.queue}
                busy={controller.busy}
                onCreate={playlists.addPlaylist}
                onRename={playlists.renamePlaylist}
                onDelete={playlists.deletePlaylist}
                onAddCurrent={playlists.addCurrentMedia}
                onRemoveTrack={playlists.removeTrack}
                onPlayTrack={(playlistId, trackId, mode) => void controller.playPlaylistTrack(playlistId, trackId, mode)}
                onPlaybackModeChange={(mode) => void controller.setPlaybackMode(mode)}
                onImportSharedPlaylist={playlists.importSharedPlaylist}
              />
            ) : (
              <LyricsView
                media={media}
                audioStatus={audio.status}
                current={lyrics.current}
                loaded={lyrics.loaded}
                onImportLrc={lyrics.importLrc}
                onImportGeneric={lyrics.importGeneric}
                onImportGroq={lyrics.importGroq}
                onTranscribeCurrentTab={controller.transcribeCurrentTab}
                onCancelTabTranscription={controller.cancelTabTranscription}
                onVisibleChange={lyrics.setVisible}
                onOffsetChange={lyrics.setOffsetMs}
                onFontScaleChange={lyrics.setFontScale}
                onPanelOpacityChange={lyrics.setPanelOpacity}
                onVerticalOffsetChange={lyrics.setVerticalOffset}
                onLeadTimeChange={lyrics.setLeadTimeSeconds}
                onLayoutModeChange={lyrics.setLayoutMode}
                onDockHeightChange={lyrics.setDockHeightPercent}
                onConvertChinese={lyrics.convertChinese}
                onUpdateLine={lyrics.updateLine}
                onBatchShiftLines={lyrics.batchShiftLines}
                onAddLine={lyrics.addLine}
                onRemoveLine={lyrics.removeLine}
                onResetToOriginal={lyrics.resetToOriginal}
                onExportLyrics={lyrics.exportLyrics}
                onMediaCommand={(command) => void controller.runMediaCommand(command)}
                seekInterval={preferences.seekInterval}
                personalSync={playlists.sync}
                lyricsSync={lyrics.sync}
                onPersonalSyncChange={playlists.setSyncEnabled}
                onRemove={lyrics.removeCurrent}
              />
            )}
          </>
        )}
      </div>
      {settingsOpen ? null : <BottomNavigation selected={selectedTab} onSelect={setSelectedTab} />}
    </div>
  );
}
