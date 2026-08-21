import { Minus, Plus, RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useI18n } from '../i18n';
import { useWheelControl } from '../useWheelControl';

interface SpeedControlProps {
  speed: number;
  disabled: boolean;
  wheelControl?: boolean;
  onChange: (speed: number) => void;
}

const QUICK_SPEEDS = [0.75, 1, 1.25];

export function SpeedControl({ speed, disabled, wheelControl = true, onChange }: SpeedControlProps) {
  const { t } = useI18n();
  const progress = ((speed - 0.5) / 1) * 100;
  const setSpeed = (next: number) => onChange(Math.max(0.25, Math.min(4.0, Number(next.toFixed(2)))));

  const sectionRef = useWheelControl<HTMLElement>({
    enabled: wheelControl,
    disabled,
    onDelta: (dir, isShift) => {
      const step = isShift ? 0.1 : 0.05;
      if (dir > 0 && speed < 4.0) {
        setSpeed(speed + step);
      } else if (dir < 0 && speed > 0.25) {
        setSpeed(speed - step);
      }
    },
  });

  return (
    <section ref={sectionRef} className="tool-section control-card speed-section" aria-labelledby="speed-heading">
      <div className="control-card-heading">
        <h2 id="speed-heading" className="section-label">{t('speedTitle')}</h2>
        <button className="control-reset" type="button" onClick={() => setSpeed(1)} disabled={disabled || Math.abs(speed - 1) < 0.025} aria-label={t('reset')}><RotateCcw size={17} /></button>
      </div>
      <div className="key-stepper key-stepper--speed">
        <button className="step-button" type="button" onClick={() => setSpeed(speed - 0.05)} disabled={disabled || speed <= 0.5} aria-label={t('playbackSpeed')}><Minus /></button>
        <output className="control-value control-value--speed"><strong>{Math.round(speed * 100)}%</strong><span>{Math.abs(speed - 1) < 0.025 ? t('originalSpeed') : `${speed.toFixed(2)}×`}</span></output>
        <button className="step-button" type="button" onClick={() => setSpeed(speed + 0.05)} disabled={disabled || speed >= 1.5} aria-label={t('playbackSpeed')}><Plus /></button>
      </div>
      <input
        aria-label={t('playbackSpeed')}
        aria-valuetext={`${Math.round(speed * 100)}%`}
        className="range-control"
        type="range"
        min={0.5}
        max={1.5}
        step={0.05}
        value={speed}
        disabled={disabled}
        style={{ '--range-progress': `${progress}%` } as CSSProperties}
        onChange={(event) => setSpeed(Number(event.currentTarget.value))}
      />
      <div className="quick-options">
        {QUICK_SPEEDS.map((quickSpeed) => (
          <button key={quickSpeed} className={Math.abs(speed - quickSpeed) < 0.025 ? 'is-selected' : ''} type="button" disabled={disabled} onClick={() => setSpeed(quickSpeed)}>
            {Math.round(quickSpeed * 100)}%
          </button>
        ))}
      </div>
    </section>
  );
}
