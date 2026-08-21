import { useState } from 'react';
import { FastForward, Pause, Play, Rewind, SkipBack, SkipForward } from 'lucide-react';
import { formatRemainingTime, formatTime } from '../../shared/audio';
import { useI18n } from '../i18n';

interface TransportControlsProps {
  currentTime: number;
  duration: number;
  paused: boolean;
  disabled: boolean;
  previousDisabled: boolean;
  nextDisabled: boolean;
  onTogglePlayback: () => void;
  onSeek: (seconds: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  seekInterval: number;
}

export function TransportControls({
  currentTime,
  duration,
  paused,
  disabled,
  previousDisabled,
  nextDisabled,
  onTogglePlayback,
  onSeek,
  onPrevious,
  onNext,
  seekInterval,
}: TransportControlsProps) {
  const { t } = useI18n();
  const [showRemaining, setShowRemaining] = useState(false);

  return (
    <section className="transport-section" aria-label={t('playbackControls')}>
      <div className="transport-buttons">
        <button type="button" disabled={previousDisabled} onClick={onPrevious} aria-label={t('previousTrack')}>
          <SkipBack />
        </button>
        <button type="button" disabled={disabled} onClick={() => onSeek(-seekInterval)} aria-label={t('rewindSeconds', { seconds: seekInterval })}>
          <Rewind />
        </button>
        <button className="play-button" type="button" disabled={disabled} onClick={onTogglePlayback} aria-label={paused ? t('play') : t('pause')}>
          {paused ? <Play fill="currentColor" /> : <Pause fill="currentColor" />}
        </button>
        <button type="button" disabled={disabled} onClick={() => onSeek(seekInterval)} aria-label={t('forwardSeconds', { seconds: seekInterval })}>
          <FastForward />
        </button>
        <button type="button" disabled={nextDisabled} onClick={onNext} aria-label={t('nextTrack')}>
          <SkipForward />
        </button>
      </div>
      <button
        type="button"
        className="transport-time"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
        onClick={() => setShowRemaining(!showRemaining)}
        title={showRemaining ? t('timeDisplayRemaining') : t('timeDisplayElapsed')}
      >
        <strong>{showRemaining ? formatRemainingTime(currentTime, duration) : formatTime(currentTime)}</strong>
        <span>/</span>
        <span>{formatTime(duration)}</span>
      </button>
    </section>
  );
}
