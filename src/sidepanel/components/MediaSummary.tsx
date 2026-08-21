import { useRef } from 'react';
import { AlertCircle, Check, ExternalLink, FileAudio, LoaderCircle, Music2, Power, Radio, RefreshCw, Search } from 'lucide-react';
import type { AudioSessionState, MediaState } from '../../shared/protocol';
import { useI18n } from '../i18n';

interface MediaSummaryProps {
  audio: AudioSessionState;
  media: MediaState;
  busy: boolean;
  detecting: boolean;
  detectionError: string | null;
  onStart: () => void;
  onStop: () => void;
  onOpen: () => void;
  onRetry: () => void;
}

export function MediaSummary({
  audio,
  media,
  busy,
  detecting,
  detectionError,
  onStart,
  onStop,
  onOpen,
  onRetry,
}: MediaSummaryProps) {
  const { t } = useI18n();
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const isActive = audio.status === 'active' || audio.status === 'starting';
  const isStarting = busy || audio.status === 'starting';
  const needsToolbarInvocation = audio.status === 'error' && Boolean(audio.error?.includes('Chrome 工具列'));

  const handleLocalFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const fileUrl = URL.createObjectURL(file);
    window.open(fileUrl, '_blank');
  };

  return (
    <section className="media-summary" aria-label={t('currentSong')}>
      <input
        ref={localFileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.webm"
        style={{ display: 'none' }}
        onChange={handleLocalFile}
      />
      <div
        className={`detection-state ${media.available ? 'detection-state--ready' : detectionError ? 'detection-state--error' : ''}`}
        role="status"
      >
        <span className="detection-icon" aria-hidden="true">
          {detecting ? <LoaderCircle className="spin" size={14} /> : media.available ? <Check size={14} /> : detectionError ? <AlertCircle size={14} /> : <Search size={14} />}
        </span>
        <span>{detecting ? t('detectingSong') : media.available ? t('songFound') : detectionError ? t('cannotConnectTab') : t('waitingForMedia')}</span>
        {media.available ? (
          <button className="inline-icon-button" type="button" onClick={onOpen} aria-label={t('openSongTab')}>
            <ExternalLink size={15} />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="retry-button" type="button" onClick={onRetry} disabled={detecting}>
              <RefreshCw size={13} />
              {t('retryDetection')}
            </button>
            <button className="retry-button" type="button" onClick={() => localFileInputRef.current?.click()} title={t('localAudioDescription')}>
              <FileAudio size={13} />
              {t('localAudio')}
            </button>
          </div>
        )}
      </div>

      <div className="media-main">
        <div className="media-icon" aria-hidden="true">
          <Music2 size={23} strokeWidth={1.8} />
        </div>
        <div className={`media-copy ${detectionError ? 'media-copy--error' : ''}`}>
          <h1>{media.available ? media.title : detectionError ? t('youtubeConnectionFailed') : t('waitingForPlayback')}</h1>
          <p>{media.available ? `${media.platform} · ${media.artist}` : detectionError ?? t('playbackAutoDetect')}</p>
          {audio.status === 'active' ? (
            <span className="engine-readout">
              <Radio size={12} />
              {t('audioProcessing')}{audio.baseLatencyMs === null ? '' : ` · ${audio.baseLatencyMs} ms`}
            </span>
          ) : null}
        </div>
      </div>

      <button
        className={`engine-button ${isActive ? 'engine-button--stop' : ''}`}
        type="button"
        onClick={isActive ? onStop : onStart}
        disabled={isStarting || !media.available || needsToolbarInvocation}
      >
        {isStarting ? <LoaderCircle className="spin" size={17} /> : <Power size={17} />}
        {isStarting ? t('startingAudio') : isActive ? t('stopAudio') : needsToolbarInvocation ? t('clickToolbar') : media.available ? t('startPractice') : t('waitingSong')}
      </button>
      {!isActive && media.available ? (
        <p className={`activation-hint ${needsToolbarInvocation ? 'activation-hint--attention' : ''}`}>
          {needsToolbarInvocation
            ? t('toolbarHint')
            : t('autoStartHint')}
        </p>
      ) : null}
    </section>
  );
}
