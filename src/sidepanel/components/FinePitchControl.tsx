import { Minus, Plus, RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';
import { formatSignedSemitones } from '../../shared/audio';
import { useI18n } from '../i18n';
import type { PitchDisplay } from '../usePreferences';
import { useWheelControl } from '../useWheelControl';

interface FinePitchControlProps {
  semitones: number;
  cents: number;
  display: PitchDisplay;
  referenceTuning: 432 | 440 | 442;
  disabled: boolean;
  wheelControl?: boolean;
  onChange: (cents: number) => void;
}

export function FinePitchControl({ semitones, cents, display, referenceTuning, disabled, wheelControl = true, onChange }: FinePitchControlProps) {
  const { t } = useI18n();
  const frequency = referenceTuning * 2 ** ((semitones + cents / 100) / 12);

  const sectionRef = useWheelControl<HTMLElement>({
    enabled: wheelControl,
    disabled,
    onDelta: (dir, isShift) => {
      const step = isShift ? 5 : 1;
      if (dir > 0 && cents < 100) {
        onChange(Math.min(100, cents + step));
      } else if (dir < 0 && cents > -100) {
        onChange(Math.max(-100, cents - step));
      }
    },
  });

  return (
    <section ref={sectionRef} className="tool-section control-card fine-pitch-section" aria-labelledby="fine-pitch-heading">
      <div className="control-card-heading">
        <h2 id="fine-pitch-heading" className="section-label">{t('finePitchTitle')}</h2>
        <button className="control-reset" type="button" onClick={() => onChange(0)} disabled={disabled || cents === 0} aria-label={t('reset')}><RotateCcw size={17} /></button>
      </div>
      <div className="key-stepper key-stepper--fine">
        <button className="step-button" type="button" onClick={() => onChange(Math.max(-100, cents - 1))} disabled={disabled || cents <= -100} aria-label={t('lowerFinePitch')}><Minus /></button>
        <output className="control-value control-value--fine" aria-live="polite"><strong>{display === 'hz' ? frequency.toFixed(2) : formatSignedSemitones(cents)}</strong><span>{display === 'hz' ? 'Hz' : 'cents'}</span></output>
        <button className="step-button" type="button" onClick={() => onChange(Math.min(100, cents + 1))} disabled={disabled || cents >= 100} aria-label={t('raiseFinePitch')}><Plus /></button>
      </div>
      <input
        aria-label={display === 'hz' ? t('finePitchHz') : t('finePitchCents')}
        aria-valuetext={display === 'hz' ? `${frequency.toFixed(2)} Hz` : `${formatSignedSemitones(cents)} cents`}
        className="range-control"
        type="range"
        min={-100}
        max={100}
        step={1}
        value={cents}
        disabled={disabled}
        style={{ '--range-progress': `${(cents + 100) / 2}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <div className="range-scale" aria-hidden="true"><span>−100</span><span>−50</span><span className="zero-tick">0</span><span>+50</span><span>+100</span></div>
    </section>
  );
}
