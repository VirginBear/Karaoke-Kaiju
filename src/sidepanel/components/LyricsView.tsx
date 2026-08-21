import {
  ArrowDown,
  ArrowUp,
  Captions,
  Check,
  Clock3,
  Cloud,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FastForward,
  FileAudio,
  FileText,
  History,
  Languages,
  ListPlus,
  LoaderCircle,
  Mic2,
  Minus,
  Pause,
  Play,
  Plus,
  Repeat2,
  Rewind,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Timer,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  exportLyricsShareCode,
  getLyricFrame,
  type GroqTranscription,
  type LyricsLayoutMode,
  type SongLyrics,
  type TimedLyricLine,
} from '../../shared/lyrics';
import { normalizeTrackUrl } from '../../shared/library';
import type { AudioEngineStatus, MediaCommand, MediaState } from '../../shared/protocol';
import { openExternalUrl } from '../client';
import { ensureGroqPermission, transcribeAudioWithGroq } from '../groq';
import { useI18n } from '../i18n';
import type { LyricsSyncState } from '../useLyricsLibrary';
import type { PlaylistSyncState } from '../usePlaylistLibrary';

import { detectChineseVariant, toSimplified, toTraditional } from '../../shared/chinese-convert';

const FLOWER_FRAGRANCE_URL = 'https://www.youtube.com/watch?v=-ZRrhoFBM4s';
const FLOWER_FRAGRANCE_REFERENCE = 'https://www.kugeci.com/song/UnlUTXBC';

interface LyricsViewProps {
  media: MediaState;
  audioStatus: AudioEngineStatus;
  current: SongLyrics | null;
  loaded: boolean;
  onImportLrc?: (text: string, sourceLabel: string) => SongLyrics;
  onImportGeneric: (text: string, sourceLabel: string) => SongLyrics;
  onImportGroq: (transcription: GroqTranscription, sourceLabel: string) => SongLyrics;
  onTranscribeCurrentTab: (options: {
    apiKey: string;
    songContext: string;
    durationSeconds: number;
  }) => Promise<GroqTranscription>;
  onCancelTabTranscription: () => Promise<void>;
  onVisibleChange: (visible: boolean) => void;
  onOffsetChange: (offsetMs: number) => void;
  onFontScaleChange: (fontScale: number) => void;
  onPanelOpacityChange: (panelOpacity: number) => void;
  onVerticalOffsetChange: (verticalOffset: number) => void;
  onLeadTimeChange: (leadTimeSeconds: number) => void;
  onLayoutModeChange?: (layoutMode: LyricsLayoutMode) => void;
  onDockHeightChange?: (dockHeightPercent: number) => void;
  onConvertChinese?: (target: 'traditional' | 'simplified') => void;
  onUpdateLine: (lineId: string, patch: Partial<TimedLyricLine>) => void;
  onBatchShiftLines: (fromLineId: string | null, deltaSeconds: number) => void;
  onAddLine: (afterLineId: string | null, text: string, start: number, end?: number) => void;
  onRemoveLine: (lineId: string) => void;
  onResetToOriginal: () => void;
  onExportLyrics: (format: 'lrc' | 'srt' | 'vtt') => string;
  onMediaCommand: (command: MediaCommand) => void;
  seekInterval: number;
  personalSync: PlaylistSyncState;
  lyricsSync: LyricsSyncState;
  onPersonalSyncChange: (enabled: boolean) => Promise<boolean>;
  onRemove: () => void;
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function formatExactTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = (safe % 60).toFixed(1);
  return `${String(mins).padStart(2, '0')}:${secs.padStart(4, '0')}`;
}

export function LyricsView({
  media,
  audioStatus: _audioStatus,
  current,
  loaded,
  onImportGeneric,
  onImportGroq,
  onTranscribeCurrentTab,
  onCancelTabTranscription,
  onVisibleChange,
  onOffsetChange,
  onFontScaleChange,
  onPanelOpacityChange,
  onVerticalOffsetChange,
  onLeadTimeChange,
  onLayoutModeChange,
  onDockHeightChange,
  onConvertChinese,
  onUpdateLine,
  onBatchShiftLines,
  onAddLine,
  onRemoveLine,
  onResetToOriginal,
  onExportLyrics,
  onMediaCommand,
  seekInterval,
  personalSync,
  lyricsSync,
  onPersonalSyncChange,
  onRemove,
}: LyricsViewProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const sheetListRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState('');
  const [sourceLabel, setSourceLabel] = useState('pasted.lrc');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(true);
  const [generating, setGenerating] = useState<'file' | 'tab' | null>(null);

  // Load saved API key from local storage
  useEffect(() => {
    try {
      chrome.storage?.local?.get?.(['groqApiKey'], (res) => {
        if (typeof res?.groqApiKey === 'string' && res.groqApiKey.trim()) {
          setApiKey(res.groqApiKey.trim());
        }
      });
    } catch {
      // ignore
    }
  }, []);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    try {
      chrome.storage?.local?.set?.({ groqApiKey: val });
    } catch {
      // ignore
    }
  };

  const clearSavedApiKey = () => {
    setApiKey('');
    try {
      void chrome.storage?.local?.remove?.(['groqApiKey']);
    } catch {
      // ignore
    }
  };

  // Editor mode & state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingLineText, setEditingLineText] = useState('');
  const [newLineText, setNewLineText] = useState('');
  const [tapMode, setTapMode] = useState(false);
  const [tapIndex, setTapIndex] = useState(0);
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);

  const frame = useMemo(
    () => current
      ? getLyricFrame(
          current.lines,
          media.currentTime + current.offsetMs / 1000,
          current.leadTimeSeconds ?? 1.5,
        )
      : null,
    [current, media.currentTime],
  );

  // Auto-scroll active lyric inside the interactive sheet list container ONLY (never moving the main window)
  useEffect(() => {
    const list = sheetListRef.current;
    const active = activeLineRef.current;
    if (!list || !active) return;

    const itemTop = active.offsetTop;
    const itemHeight = active.offsetHeight;
    const listScrollTop = list.scrollTop;
    const listHeight = list.clientHeight;

    // Only adjust inner scroll container if current active line is out of view
    if (itemTop < listScrollTop || itemTop + itemHeight > listScrollTop + listHeight) {
      const targetTop = itemTop - (listHeight / 2) + (itemHeight / 2);
      list.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });
    }
  }, [frame?.activeIndex]);

  const hasFlowerFragranceReference = normalizeTrackUrl(media.url) === FLOWER_FRAGRANCE_URL;

  const importDraft = () => {
    setError(null);
    try {
      const saved = onImportGeneric(draft, sourceLabel);
      setNotice(t('lyricsSaved', { value: saved.lines.length }));
      setDraft('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('lyricsImportFailed'));
    }
  };

  const readLyricsFile = async (file: File) => {
    setError(null);
    try {
      const content = await file.text();
      setDraft(content);
      setSourceLabel(file.name);
      setNotice(t('lyricsFileReady', { name: file.name }));
    } catch {
      setError(t('lyricsFileReadFailed'));
    }
  };

  const handleExport = (format: 'lrc' | 'srt' | 'vtt', action: 'copy' | 'download') => {
    if (!current) return;
    const content = onExportLyrics(format);
    if (!content) return;

    if (action === 'copy') {
      void navigator.clipboard.writeText(content).then(() => {
        setNotice(t('lyricsCopied'));
      });
    } else {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${media.title || 'lyrics'}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    }
  };

  const generateWithGroq = async () => {
    if (!audioFile || !consent) {
      setError(t('aiChooseAndConsent'));
      return;
    }
    setGenerating('file');
    setError(null);
    setNotice(null);
    try {
      const transcription = await transcribeAudioWithGroq({
        apiKey,
        file: audioFile,
        songContext: `${media.artist} - ${media.title}`,
      });
      const saved = onImportGroq(transcription, `Groq · ${audioFile.name}`);
      setNotice(t('aiReady', { value: saved.lines.length }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('aiFailed'));
    } finally {
      setGenerating(null);
    }
  };

  const generateFromCurrentTab = async () => {
    if (!consent || !apiKey.trim()) {
      setError(t('aiTabKeyAndConsent'));
      return;
    }

    setGenerating('tab');
    setError(null);
    setNotice(null);
    try {
      const key = apiKey.trim();
      await ensureGroqPermission();
      const transcription = await onTranscribeCurrentTab({
        apiKey: key,
        songContext: `${media.artist} - ${media.title}`,
        durationSeconds: media.duration,
      });
      const saved = onImportGroq(transcription, 'Groq · YouTube 高速 AI 解析');
      setNotice(t('aiTabReady', { value: saved.lines.length }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('aiFailed'));
    } finally {
      setGenerating(null);
    }
  };

  const cancelCurrentTabGeneration = async () => {
    try {
      await onCancelTabTranscription();
      setNotice(t('aiTabCancelled'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法取消分頁錄音');
    } finally {
      setGenerating(null);
    }
  };

  const startTapRecording = () => {
    if (!current?.lines.length) return;
    setTapIndex(0);
    setTapTimestamps([]);
    setTapMode(true);
    setEditorOpen(true);
  };

  const recordTap = () => {
    if (!current) return;
    const nowSec = Number(media.currentTime.toFixed(2));
    const nextTimestamps = [...tapTimestamps, nowSec];
    setTapTimestamps(nextTimestamps);

    if (tapIndex + 1 >= current.lines.length) {
      // Finished all lines! Apply batch timestamps
      for (let i = 0; i < current.lines.length; i += 1) {
        const start = nextTimestamps[i] ?? current.lines[i]!.start;
        const end = nextTimestamps[i + 1] ?? Number((start + 4.0).toFixed(2));
        onUpdateLine(current.lines[i]!.id, { start, end });
      }
      setTapMode(false);
      setNotice('已完成全曲打拍對時！');
    } else {
      setTapIndex(tapIndex + 1);
    }
  };

  const isDockBottom = (current?.layoutMode ?? 'dock-bottom') === 'dock-bottom';
  const currentVariant = useMemo(() => {
    if (!current?.lines?.length) return 'none';
    const sampleText = current.lines.slice(0, 8).map((l) => l.text).join(' ');
    return detectChineseVariant(sampleText);
  }, [current]);

  return (
    <section className="lyrics-view" aria-label={t('lyricsTitle')}>
      <div className="tab-hero-badge" aria-hidden="true">
        <Captions size={27} aria-hidden="true" />
      </div>

      <section className="lyrics-song-card" aria-label={t('currentSong')}>
        <div className="lyrics-song-icon"><Captions size={22} /></div>
        <div>
          <strong>{media.available ? media.title : t('noMedia')}</strong>
          <small>{media.available ? `${media.platform} · ${media.artist}` : t('returnToPractice')}</small>
        </div>
      </section>

      {!loaded ? <p className="lyrics-loading">{t('lyricsLoading')}</p> : null}

      <section className="lyrics-transport-card" aria-label={t('lyricsQuickControls')}>
        <div className="lyrics-transport-status">
          <strong>{formatTime(media.currentTime)}</strong>
          <span>/ {formatTime(media.duration)}</span>
          <small>{t('lyricsQuickControls')}</small>
        </div>
        <div className="lyrics-transport-main">
          <button type="button" disabled={!media.available} aria-label={t('rewindSeconds', { seconds: seekInterval })} onClick={() => onMediaCommand({ kind: 'SEEK_RELATIVE', seconds: -seekInterval })}><Rewind size={18} /></button>
          <button className="is-primary" type="button" disabled={!media.available} aria-label={media.paused ? t('play') : t('pause')} onClick={() => onMediaCommand({ kind: 'TOGGLE_PLAYBACK' })}>{media.paused ? <Play size={19} fill="currentColor" /> : <Pause size={19} fill="currentColor" />}</button>
          <button type="button" disabled={!media.available} aria-label={t('forwardSeconds', { seconds: seekInterval })} onClick={() => onMediaCommand({ kind: 'SEEK_RELATIVE', seconds: seekInterval })}><FastForward size={18} /></button>
        </div>
        <div className="lyrics-ab-controls">
          <button type="button" disabled={!media.available} onClick={() => onMediaCommand({ kind: 'SET_LOOP_POINT', point: 'start' })}><span>A</span>{media.loop.start === null ? t('setA') : formatTime(media.loop.start)}</button>
          <button type="button" disabled={!media.available} onClick={() => onMediaCommand({ kind: 'SET_LOOP_POINT', point: 'end' })}><span>B</span>{media.loop.end === null ? t('setB') : formatTime(media.loop.end)}</button>
          <button type="button" className={media.loop.enabled ? 'is-active' : ''} disabled={!media.available || media.loop.start === null || media.loop.end === null} onClick={() => onMediaCommand({ kind: 'TOGGLE_LOOP' })}><Repeat2 size={16} />{media.loop.enabled ? t('looping') : t('loopOn')}</button>
          <button type="button" disabled={!media.available || (media.loop.start === null && media.loop.end === null)} onClick={() => onMediaCommand({ kind: 'CLEAR_LOOP' })}><RotateCcw size={15} />{t('clear')}</button>
        </div>
      </section>

      {current ? (
        <>
          {/* Interactive Seek-to-Lyric Sheet (點句即唱) */}
          <section className="lyrics-sheet-card" aria-label={t('interactiveSheetTitle')}>
            <div className="lyrics-sheet-header">
              <div className="lyrics-sheet-header-top">
                <div className="lyrics-sheet-title">
                  <Mic2 size={16} />
                  <strong>{t('interactiveSheetTitle')}</strong>
                  <span className="lyrics-sheet-count">{t('lyricsLinesCount', { value: current.lines.length })}</span>
                </div>
                <div className="lyrics-chinese-toggle-pill" role="group" aria-label="繁簡轉換">
                  <button
                    type="button"
                    className={`chinese-toggle-btn${currentVariant === 'traditional' ? ' is-active' : ''}`}
                    onClick={() => {
                      onConvertChinese?.('traditional');
                      setNotice('已將歌詞轉為繁體中文');
                    }}
                    title="一鍵將整首歌詞轉為繁體中文"
                  >
                    繁體
                  </button>
                  <button
                    type="button"
                    className={`chinese-toggle-btn${currentVariant === 'simplified' ? ' is-active' : ''}`}
                    onClick={() => {
                      onConvertChinese?.('simplified');
                      setNotice('已将歌词转换为简体中文');
                    }}
                    title="一鍵將整首歌詞轉為簡體中文"
                  >
                    简体
                  </button>
                </div>
              </div>
              <small className="lyrics-sheet-hint">{t('clickToSeekHint')}</small>
            </div>

            <div className="lyrics-sheet-list" ref={sheetListRef}>
              {current.lines.map((line, idx) => {
                const isActive = frame?.activeIndex === idx;
                return (
                  <button
                    key={line.id}
                    type="button"
                    ref={isActive ? activeLineRef : null}
                    className={`lyrics-sheet-row${isActive ? ' is-active' : ''}`}
                    onClick={() => {
                      onMediaCommand({ kind: 'SEEK_ABSOLUTE', seconds: line.start });
                      if (media.paused) {
                        onMediaCommand({ kind: 'SET_PLAYBACK', paused: false });
                      }
                    }}
                    title={t('clickToSingThisLine')}
                  >
                    <span className="lyrics-sheet-time">{formatExactTime(line.start)}</span>
                    <span className="lyrics-sheet-play-icon">
                      <Play size={11} fill="currentColor" />
                    </span>
                    <span className="lyrics-sheet-text">{line.text}</span>
                    {isActive ? (
                      <span className="lyrics-sheet-badge">{t('singingNow')}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="lyrics-overlay-card" aria-label={t('overlayTitle')}>
            <div className="lyrics-section-heading">
              <div>
                <strong>{t('overlayTitle')}</strong>
                <small>{isDockBottom ? t('dockBottom') : t('overlayDescription')}</small>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={current.visible}
                className={`toggle-control${current.visible ? ' is-on' : ''}`}
                onClick={() => onVisibleChange(!current.visible)}
                aria-label={t('showOnVideo')}
              ><span /></button>
            </div>

            <div className="lyrics-karaoke-preview" aria-label={t('karaokePreview')}>
              <PreviewLine text={frame?.current?.text} progress={frame?.progress ?? 0} side="left" scale={current.fontScale} />
              <PreviewLine text={frame?.next?.text} progress={0} side="right" scale={current.fontScale} />
            </div>

            <div className="lyrics-offset-control" aria-label={t('lyricsFineTiming')}>
              <div className="lyrics-control-label">
                <Clock3 size={15} />
                <span>
                  <strong>{t('timingOffset')}</strong>
                  <small>{t('lyricsFineTiming')}</small>
                </span>
                <output>{current.offsetMs === 0 ? '±0.0 s' : `${current.offsetMs > 0 ? '+' : ''}${(current.offsetMs / 1000).toFixed(1)} s`}</output>
              </div>
              <div className="lyrics-nudge-buttons">
                <button type="button" onClick={() => onOffsetChange(current.offsetMs - 500)} title={t('lyricsEarlierHalf')}><Rewind size={11} />-0.5s</button>
                <button type="button" onClick={() => onOffsetChange(current.offsetMs - 100)} title={t('lyricsEarlierFine')}><Minus size={11} />-0.1s</button>
                <button type="button" onClick={() => onOffsetChange(0)} title={t('reset')}>{t('reset')}</button>
                <button type="button" onClick={() => onOffsetChange(current.offsetMs + 100)} title={t('lyricsLaterFine')}>+0.1s<Plus size={11} /></button>
                <button type="button" onClick={() => onOffsetChange(current.offsetMs + 500)} title={t('lyricsLaterHalf')}>+0.5s<FastForward size={11} /></button>
              </div>
            </div>

            <div className="lyrics-display-settings" aria-label={t('lyricsDisplaySettings')}>
              <div className="lyrics-control-label"><SlidersHorizontal size={16} /><span><strong>{t('lyricsDisplaySettings')}</strong><small>{t('lyricsDisplaySettingsDescription')}</small></span></div>
              
              {/* Layout Mode Segmented Control */}
              <div className="lyrics-mode-control">
                <span className="lyrics-mode-label">{t('layoutMode')}</span>
                <div className="lyrics-mode-tabs">
                  <button
                    type="button"
                    className={`lyrics-mode-btn${isDockBottom ? ' is-active' : ''}`}
                    onClick={() => onLayoutModeChange?.('dock-bottom')}
                  >
                    💻 底部獨立欄
                  </button>
                  <button
                    type="button"
                    className={`lyrics-mode-btn${!isDockBottom ? ' is-active' : ''}`}
                    onClick={() => onLayoutModeChange?.('video-overlay')}
                  >
                    📺 影片內嵌
                  </button>
                </div>
              </div>

              {isDockBottom ? (
                <label className="lyrics-range-row">
                  <SlidersHorizontal size={15} /><span>{t('dockHeight')}</span>
                  <input
                    type="range"
                    min="18"
                    max="50"
                    step="1"
                    value={current.dockHeightPercent ?? 30}
                    onChange={(event) => onDockHeightChange?.(Number(event.currentTarget.value))}
                  />
                  <output>{current.dockHeightPercent ?? 30}%</output>
                </label>
              ) : null}

              <label className="lyrics-range-row">
                <Type size={15} /><span>{t('lyricsFontSize')}</span>
                <input type="range" min="80" max="140" step="5" value={Math.round(current.fontScale * 100)} onChange={(event) => onFontScaleChange(Number(event.currentTarget.value) / 100)} />
                <output>{Math.round(current.fontScale * 100)}%</output>
              </label>
              <label className="lyrics-range-row">
                <Captions size={15} /><span>{t('lyricsPanelOpacity')}</span>
                <input type="range" min="20" max="95" step="5" value={Math.round(current.panelOpacity * 100)} onChange={(event) => onPanelOpacityChange(Number(event.currentTarget.value) / 100)} />
                <output>{Math.round(current.panelOpacity * 100)}%</output>
              </label>
              <label className="lyrics-range-row">
                <Timer size={15} /><span>{t('lyricsLeadTime')}</span>
                <input type="range" min="0.5" max="3.0" step="0.1" value={current.leadTimeSeconds ?? 1.5} onChange={(event) => onLeadTimeChange(Number(event.currentTarget.value))} />
                <output>{(current.leadTimeSeconds ?? 1.5).toFixed(1)} s</output>
              </label>

              {!isDockBottom ? (
                <div className="lyrics-position-row">
                  <span><Captions size={15} />{t('lyricsPanelPosition')}</span>
                  <div>
                    <button type="button" aria-label={t('lyricsMoveDown')} onClick={() => onVerticalOffsetChange(current.verticalOffset - 2)}><ArrowDown size={16} /></button>
                    <output>{current.verticalOffset === 0 ? t('lyricsPositionDefault') : `${current.verticalOffset > 0 ? '+' : ''}${current.verticalOffset}%`}</output>
                    <button type="button" aria-label={t('lyricsMoveUp')} onClick={() => onVerticalOffsetChange(current.verticalOffset + 2)}><ArrowUp size={16} /></button>
                    <button type="button" onClick={() => onVerticalOffsetChange(0)}>{t('reset')}</button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="lyrics-export-bar">
              <div className="lyrics-export-heading"><Languages size={15} /><span>簡繁歌詞轉換</span></div>
              <div className="lyrics-export-buttons">
                <button type="button" onClick={() => { onConvertChinese?.('traditional'); setNotice(t('chineseConvertedTrad')); }}>
                  {t('convertToTraditional')} (繁)
                </button>
                <button type="button" onClick={() => { onConvertChinese?.('simplified'); setNotice(t('chineseConvertedSimp')); }}>
                  {t('convertToSimplified')} (简)
                </button>
              </div>
            </div>

            <div className="lyrics-export-bar">
              <div className="lyrics-export-heading"><Download size={15} /><span>{t('exportLyrics')}</span></div>
              <div className="lyrics-export-buttons">
                <button
                  type="button"
                  style={{ background: 'var(--surface-selected)', color: 'var(--accent)', fontWeight: 700 }}
                  onClick={() => {
                    const code = exportLyricsShareCode(current);
                    void navigator.clipboard.writeText(code);
                    setNotice(`已複製「${current.title}」專屬歌詞分享碼！好友貼上即可直接同步動態歌詞。`);
                  }}
                  title="產生並複製歌詞分享代碼，好友貼上即可秒速同步"
                >
                  <Share2 size={13} />分享歌詞代碼
                </button>
                <button type="button" onClick={() => handleExport('lrc', 'copy')}><Copy size={13} />LRC</button>
                <button type="button" onClick={() => handleExport('srt', 'copy')}><Copy size={13} />SRT</button>
                <button type="button" onClick={() => handleExport('vtt', 'copy')}><Copy size={13} />VTT</button>
                <button type="button" onClick={() => handleExport('lrc', 'download')}><Download size={13} />.lrc</button>
                <button type="button" onClick={() => handleExport('srt', 'download')}><Download size={13} />.srt</button>
              </div>
            </div>

            <div className="lyrics-source-row">
              <span><FileText size={15} />{t('lyricsSource')}: {current.sourceLabel}</span>
              <span>{t('lyricsLinesCount', { value: current.lines.length })}</span>
            </div>
          </section>

          {/* Timeline & Line-by-Line Editor Section */}
          <section className="lyrics-editor-card" aria-label={t('lyricsEditorTitle')}>
            <div className="lyrics-section-heading">
              <div>
                <strong>{t('lyricsEditorTitle')}</strong>
                <small>{t('lyricsEditorDescription')}</small>
              </div>
              <div className="lyrics-editor-actions">
                <button
                  className={`lyrics-subtle-button${editorOpen ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => setEditorOpen(!editorOpen)}
                >
                  <Edit3 size={15} />
                  {editorOpen ? t('close') : t('lyricsEditorTitle')}
                </button>
              </div>
            </div>

            {/* Tap-to-Time mode toggle */}
            <div className="lyrics-tap-mode-box">
              <div className="lyrics-tap-mode-header">
                <div>
                  <Mic2 size={16} />
                  <strong>{t('tapToTimeTitle')}</strong>
                </div>
                <button
                  className={`lyrics-tap-button${tapMode ? ' is-recording' : ''}`}
                  type="button"
                  onClick={() => {
                    if (tapMode) {
                      setTapMode(false);
                    } else {
                      startTapRecording();
                    }
                  }}
                >
                  {tapMode ? <Square size={14} fill="currentColor" /> : <Play size={14} />}
                  {tapMode ? t('exitTapMode') : t('startTapMode')}
                </button>
              </div>
              <small>{t('tapToTimeDescription')}</small>

              {tapMode ? (
                <div className="lyrics-tap-live-area">
                  <div className="lyrics-tap-counter">
                    {t('tapProgress', { current: tapIndex + 1, total: current.lines.length })}
                  </div>
                  <div className="lyrics-tap-current-line">
                    <span className="lyrics-tap-line-tag">NEXT</span>
                    <strong>{current.lines[tapIndex]?.text || '—'}</strong>
                  </div>
                  <button className="lyrics-tap-strike-button" type="button" onClick={recordTap}>
                    <Mic2 size={20} />
                    {t('tapCurrentLine')}
                  </button>
                </div>
              ) : null}
            </div>

            {editorOpen ? (
              <div className="lyrics-timeline-list">
                <div className="lyrics-timeline-toolbar">
                  <span className="lyrics-timeline-count">{t('lyricsLinesCount', { value: current.lines.length })}</span>
                  <button
                    className="lyrics-reset-button"
                    type="button"
                    onClick={() => {
                      if (window.confirm(t('resetToOriginalConfirm'))) onResetToOriginal();
                    }}
                  >
                    <History size={14} />
                    {t('resetToOriginal')}
                  </button>
                </div>

                <div className="lyrics-lines-scroll">
                  {current.lines.map((line, idx) => {
                    const isActive = frame?.current?.id === line.id;
                    const isEditing = editingLineId === line.id;

                    return (
                      <div
                        key={line.id}
                        className={`lyrics-timeline-item${isActive ? ' is-active' : ''}`}
                      >
                        <div className="lyrics-line-header-row">
                          <span className="lyrics-line-index">#{idx + 1}</span>
                          <button
                            className="lyrics-seek-line-button"
                            type="button"
                            title={t('seekToLine')}
                            onClick={() => onMediaCommand({ kind: 'SEEK_ABSOLUTE', seconds: line.start })}
                          >
                            <Play size={13} fill="currentColor" />
                          </button>

                          {isEditing ? (
                            <div className="lyrics-line-edit-input-row">
                              <input
                                type="text"
                                value={editingLineText}
                                onChange={(e) => setEditingLineText(e.target.value)}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateLine(line.id, { text: editingLineText });
                                  setEditingLineId(null);
                                }}
                              ><Check size={14} /></button>
                            </div>
                          ) : (
                            <span
                              className="lyrics-line-text"
                              onClick={() => {
                                setEditingLineId(line.id);
                                setEditingLineText(line.text);
                              }}
                              title="Click to edit text"
                            >
                              {line.text}
                            </span>
                          )}

                          <button
                            className="lyrics-line-delete-button"
                            type="button"
                            title={t('deleteLine')}
                            onClick={() => onRemoveLine(line.id)}
                          ><Trash2 size={13} /></button>
                        </div>

                        {/* Timing fine adjust row */}
                        <div className="lyrics-line-timing-row">
                          <div className="lyrics-timing-cell">
                            <small>Start: {formatExactTime(line.start)}</small>
                            <div className="lyrics-timing-btns">
                              <button type="button" onClick={() => onUpdateLine(line.id, { start: Math.max(0, line.start - 0.5) })}>-0.5</button>
                              <button type="button" onClick={() => onUpdateLine(line.id, { start: Math.max(0, line.start - 0.1) })}>-0.1</button>
                              <button type="button" onClick={() => onUpdateLine(line.id, { start: line.start + 0.1 })}>+0.1</button>
                              <button type="button" onClick={() => onUpdateLine(line.id, { start: line.start + 0.5 })}>+0.5</button>
                              <button
                                className="lyrics-set-time-btn"
                                type="button"
                                onClick={() => onUpdateLine(line.id, { start: Math.round(media.currentTime * 10) / 10 })}
                                title={t('setStartTime')}
                              >
                                {t('setStartTime')}
                              </button>
                            </div>
                          </div>

                          <div className="lyrics-timing-cell">
                            <small>End: {formatExactTime(line.end)}</small>
                            <div className="lyrics-timing-btns">
                              <button type="button" onClick={() => onUpdateLine(line.id, { end: Math.max(line.start + 0.1, line.end - 0.5) })}>-0.5</button>
                              <button type="button" onClick={() => onUpdateLine(line.id, { end: Math.max(line.start + 0.1, line.end - 0.1) })}>-0.1</button>
                              <button type="button" onClick={() => onUpdateLine(line.id, { end: line.end + 0.1 })}>+0.1</button>
                              <button type="button" onClick={() => onUpdateLine(line.id, { end: line.end + 0.5 })}>+0.5</button>
                              <button
                                className="lyrics-set-time-btn"
                                type="button"
                                onClick={() => onUpdateLine(line.id, { end: Math.round(media.currentTime * 10) / 10 })}
                                title={t('setEndTime')}
                              >
                                {t('setEndTime')}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Shift from here row */}
                        <div className="lyrics-shift-from-row">
                          <span>{t('shiftFromHere')}:</span>
                          <button type="button" onClick={() => onBatchShiftLines(line.id, -0.5)}>-0.5s</button>
                          <button type="button" onClick={() => onBatchShiftLines(line.id, -0.1)}>-0.1s</button>
                          <button type="button" onClick={() => onBatchShiftLines(line.id, 0.1)}>+0.1s</button>
                          <button type="button" onClick={() => onBatchShiftLines(line.id, 0.5)}>+0.5s</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add new line at end */}
                <div className="lyrics-add-line-form">
                  <input
                    type="text"
                    value={newLineText}
                    onChange={(e) => setNewLineText(e.target.value)}
                    placeholder={t('addLine')}
                  />
                  <button
                    type="button"
                    disabled={!newLineText.trim()}
                    onClick={() => {
                      const lastLine = current.lines[current.lines.length - 1];
                      const start = lastLine ? lastLine.end + 0.5 : Math.round(media.currentTime * 10) / 10;
                      onAddLine(lastLine ? lastLine.id : null, newLineText, start);
                      setNewLineText('');
                    }}
                  >
                    <ListPlus size={15} />
                    {t('addLine')}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </>
      ) : (
        <section className="lyrics-empty-state">
          <Captions size={30} />
          <strong>{t('noLyrics')}</strong>
          <p>{t('noLyricsDescription')}</p>
        </section>
      )}

      <section className="lyrics-sync-card" aria-label={t('lyricsCloudSync')}>
        <div className="lyrics-sync-icon"><Cloud size={19} /></div>
        <div>
          <strong>{t('lyricsCloudSync')}</strong>
          <small>{personalSync.enabled ? t('lyricsCloudSyncOn') : t('lyricsCloudSyncOff')}</small>
          {personalSync.email ? <span>{personalSync.email}</span> : null}
          {lyricsSync.error || personalSync.error ? <span className="is-error">{lyricsSync.error ?? personalSync.error}</span> : null}
        </div>
        <button type="button" disabled={personalSync.phase === 'syncing' || lyricsSync.phase === 'syncing'} onClick={() => void onPersonalSyncChange(!personalSync.enabled)}>
          {personalSync.phase === 'syncing' || lyricsSync.phase === 'syncing' ? <LoaderCircle className="spin" size={15} /> : <Cloud size={15} />}
          {personalSync.enabled ? t('syncLinked') : t('linkGoogleAccount')}
        </button>
        {lyricsSync.bytesInUse !== null ? <small className="lyrics-sync-usage">{t('syncUsage', { used: (lyricsSync.bytesInUse / 1024).toFixed(1) })}</small> : null}
      </section>

      {hasFlowerFragranceReference ? (
        <section className="lyrics-reference-card">
          <div><ExternalLink size={19} /><span><strong>{t('openReferenceLyrics')}</strong><small>{t('referenceLyricsDescription')}</small></span></div>
          <button type="button" onClick={() => void openExternalUrl(FLOWER_FRAGRANCE_REFERENCE)}>{t('open')}<ExternalLink size={15} /></button>
        </section>
      ) : null}

      <section className="lyrics-import-card">
        <div className="lyrics-section-heading">
          <div><strong>{t('importLyrics')}</strong><small>{t('importFormatsSupported')}</small></div>
          <Upload size={20} />
        </div>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept=".lrc,.srt,.vtt,.txt,text/plain"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void readLyricsFile(file);
          }}
        />
        <button className="lyrics-file-button" type="button" onClick={() => fileInputRef.current?.click()}>
          <FileText size={18} />{t('chooseLrcFile')}
        </button>
        <textarea
          value={draft}
          onChange={(event) => {
            const val = event.currentTarget.value;
            setDraft(val);
            if (val.trim().startsWith('diaochang://lyrics/')) {
              setSourceLabel('社群分享歌詞');
            } else {
              setSourceLabel('pasted.lrc');
            }
          }}
          placeholder="貼上 LRC / SRT / VTT 內容，或貼上 diaochang://lyrics/... 歌詞分享碼"
          aria-label={t('pasteLrc')}
          spellCheck={false}
        />
        {draft.trim() ? (
          <div className="lyrics-export-buttons" style={{ marginBottom: '8px' }}>
            <button type="button" onClick={() => setDraft(toTraditional(draft))}>{t('convertToTraditional')} (繁)</button>
            <button type="button" onClick={() => setDraft(toSimplified(draft))}>{t('convertToSimplified')} (简)</button>
          </div>
        ) : null}
        <button className="lyrics-primary-button" type="button" disabled={!draft.trim() || !media.available} onClick={importDraft}>
          <Check size={17} />{t('saveLyrics')}
        </button>
      </section>

      <details className="lyrics-ai-details">
        <summary className="lyrics-ai-summary" style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} />
          <span>{t('aiTiming')} (選用實驗功能)</span>
        </summary>
        <section className="lyrics-ai-card" style={{ marginTop: '8px' }}>
          <div className="lyrics-section-heading">
            <div><strong>{t('aiTiming')}</strong><small>{t('aiDescription')}</small></div>
            <Sparkles size={20} />
          </div>
          <div className="lyrics-ai-notice">{t('aiExternalNotice')}</div>
          <label className="lyrics-field">
            <span>{t('groqApiKey')}</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => handleApiKeyChange(event.currentTarget.value)}
              placeholder="輸入 Groq API Key"
              autoComplete="off"
            />
            <div className="lyrics-api-key-help">
              <small>{t('groqApiKeyNotSaved')}</small>
              <button type="button" className="lyrics-subtle-button" onClick={clearSavedApiKey} disabled={!apiKey.trim()}>
                {t('clearGroqApiKey')}
              </button>
            </div>
          </label>
          <label className="lyrics-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.currentTarget.checked)} />
            <span>{t('audioConsent')}</span>
          </label>
          <div className="lyrics-tab-ai">
            <div>
              <Sparkles size={18} />
              <span>
                <strong>{t('aiUseCurrentTab')}</strong>
                <small>{generating === 'tab'
                  ? t('aiTabRecordingProgress')
                  : t('aiUseCurrentTabDescription')}</small>
              </span>
            </div>
            <button
              className={`lyrics-primary-button${generating === 'tab' ? ' is-cancel' : ''}`}
              type="button"
              disabled={generating === 'file' || !apiKey.trim() || !consent || !media.available}
              onClick={() => generating === 'tab' ? void cancelCurrentTabGeneration() : void generateFromCurrentTab()}
            >
              {generating === 'tab' ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
              {generating === 'tab' ? t('aiTabRecordingProgress') : t('aiGenerateFromCurrentTab')}
            </button>
          </div>
          <div className="lyrics-ai-divider"><span>{t('orChooseAudioFile')}</span></div>
          <input
            ref={audioInputRef}
            className="visually-hidden"
            type="file"
            accept="audio/*,.flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.wav,.webm"
            onChange={(event) => setAudioFile(event.currentTarget.files?.[0] ?? null)}
          />
          <button className="lyrics-file-button" type="button" disabled={generating !== null} onClick={() => audioInputRef.current?.click()}>
            <FileAudio size={18} />
            {audioFile ? `${audioFile.name} · ${formatFileSize(audioFile.size)}` : t('chooseAudio')}
          </button>
          <button
            className="lyrics-primary-button"
            type="button"
            disabled={generating !== null || !apiKey.trim() || !audioFile || !consent || !media.available}
            onClick={() => void generateWithGroq()}
          >
            {generating === 'file' ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />}
            {generating === 'file' ? t('aiGenerating') : t('generateWithAi')}
          </button>
        </section>
      </details>

      {notice ? <div className="lyrics-feedback is-success" role="status">{notice}</div> : null}
      {error ? <div className="lyrics-feedback is-error" role="alert">{error}</div> : null}

      {current ? (
        <button
          className="lyrics-delete-button"
          type="button"
          onClick={() => {
            if (window.confirm(t('removeLyricsConfirm'))) onRemove();
          }}
        ><Trash2 size={16} />{t('removeLyrics')}</button>
      ) : null}
    </section>
  );
}

function PreviewLine({ text = '', progress, side, scale }: { text?: string; progress: number; side: 'left' | 'right'; scale: number }) {
  return (
    <div className={`lyrics-preview-line is-${side}${text ? '' : ' is-empty'}`} style={{ fontSize: `${17 * scale}px` }}>
      <span>{text || '—'}</span>
      {text ? <span className="is-fill" style={{ clipPath: `inset(0 ${(100 - progress * 100).toFixed(2)}% 0 0)` }}>{text}</span> : null}
    </div>
  );
}
