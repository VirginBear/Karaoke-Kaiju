import { Minus, Plus, RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';
import { formatSignedSemitones } from '../../shared/audio';
import { useI18n } from '../i18n';
import { useWheelControl } from '../useWheelControl';

interface KeyControlProps {
  semitones: number;
  maxRange: 6 | 12 | 24 | 36;
  disabled: boolean;
  wheelControl?: boolean;
  varispeed?: boolean;
  onChange: (semitones: number) => void;
}

export function KeyControl({ semitones, maxRange, disabled, wheelControl = true, varispeed = false, onChange }: KeyControlProps) {
  const { t } = useI18n();
  const normalized = Math.max(-maxRange, Math.min(maxRange, semitones));
  const progress = ((normalized + maxRange) / (maxRange * 2)) * 100;
  const half = Math.round(maxRange / 2);

  const sectionRef = useWheelControl<HTMLElement>({
    enabled: wheelControl,
    disabled,
    onDelta: (dir) => {
      if (dir > 0 && normalized < maxRange) {
        onChange(normalized + 1);
      } else if (dir < 0 && normalized > -maxRange) {
        onChange(normalized - 1);
      }
    },
  });

  return (
    <section
      ref={sectionRef}
      className="tool-section control-card key-section"
      aria-labelledby="key-heading"
    >
      <div className="control-card-heading">
        <div>
          <h2 id="key-heading" className="section-label">
            {t('keyTitle')}
            {varispeed ? <span style={{ marginLeft: '6px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(234, 179, 8, 0.2)', color: '#EAB308' }}>Varispeed</span> : null}
          </h2>
          <p>{t('equalTemperament')}</p>
        </div>
        <button className="control-reset" type="button" onClick={() => onChange(0)} disabled={disabled || semitones === 0} aria-label={t('reset')}>
          <RotateCcw size={17} />
        </button>
      </div>
      <div className="key-stepper">
        <button className="step-button" type="button" aria-label={t('lowerSemitone')} onClick={() => onChange(normalized - 1)} disabled={disabled || normalized <= -maxRange}><Minus /></button>
        <output className="control-value" aria-live="polite"><strong>{formatSignedSemitones(normalized)}</strong><span>{t('semitone')}</span></output>
        <button className="step-button" type="button" aria-label={t('raiseSemitone')} onClick={() => onChange(normalized + 1)} disabled={disabled || normalized >= maxRange}><Plus /></button>
      </div>
      <div className="range-wrap range-wrap--key">
        <input
          aria-label={t('keyTitle')}
          aria-valuetext={`${formatSignedSemitones(normalized)} ${t('semitone')}`}
          className="range-control"
          type="range"
          min={-maxRange}
          max={maxRange}
          step={1}
          value={normalized}
          disabled={disabled}
          style={{ '--range-progress': `${progress}%` } as CSSProperties}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
        <div className="range-scale range-scale--key" aria-hidden="true"><span>−{maxRange}</span><span>−{half}</span><span className="zero-tick">0</span><span>+{half}</span><span>+{maxRange}</span></div>
      </div>
    </section>
  );
}
