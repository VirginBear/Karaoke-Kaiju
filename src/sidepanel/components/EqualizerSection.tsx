import { RotateCcw, Sliders } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useI18n } from '../i18n';
import { useWheelControl } from '../useWheelControl';

interface EqualizerSectionProps {
  equalizer: { low: number; mid: number; high: number };
  disabled: boolean;
  wheelControl?: boolean;
  onChange: (patch: { low: number; mid: number; high: number }) => void;
}

function EqBandColumn({
  band,
  label,
  freq,
  val,
  disabled,
  wheelControl,
  onChange,
}: {
  band: 'low' | 'mid' | 'high';
  label: string;
  freq: string;
  val: number;
  disabled: boolean;
  wheelControl: boolean;
  onChange: (band: 'low' | 'mid' | 'high', value: number) => void;
}) {
  const columnRef = useWheelControl<HTMLDivElement>({
    enabled: wheelControl,
    disabled,
    onDelta: (dir) => {
      if (dir > 0 && val < 12) {
        onChange(band, val + 1);
      } else if (dir < 0 && val > -12) {
        onChange(band, val - 1);
      }
    },
  });

  const progress = ((val + 12) / 24) * 100;

  return (
    <div
      ref={columnRef}
      className="eq-band-column"
      style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 8px', borderRadius: '10px', textAlign: 'center' }}
    >
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{freq}</div>
      <output style={{ display: 'block', fontSize: '16px', fontWeight: 700, margin: '6px 0', color: val === 0 ? 'var(--text-primary)' : val > 0 ? '#38BDF8' : '#F43F5E' }}>
        {val > 0 ? `+${val}` : val} dB
      </output>
      <input
        aria-label={`${label} (${freq})`}
        className="range-control"
        type="range"
        min={-12}
        max={12}
        step={1}
        value={val}
        disabled={disabled}
        style={{ '--range-progress': `${progress}%` } as CSSProperties}
        onChange={(e) => onChange(band, Number(e.currentTarget.value))}
      />
    </div>
  );
}

export function EqualizerSection({
  equalizer,
  disabled,
  wheelControl = true,
  onChange,
}: EqualizerSectionProps) {
  const { t } = useI18n();

  const handleBandChange = (band: 'low' | 'mid' | 'high', value: number) => {
    onChange({
      ...equalizer,
      [band]: Math.max(-12, Math.min(12, Math.round(value))),
    });
  };

  const isFlat = equalizer.low === 0 && equalizer.mid === 0 && equalizer.high === 0;

  return (
    <section className="tool-section control-card equalizer-section" aria-labelledby="eq-heading">
      <div className="control-card-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} />
          <div>
            <h2 id="eq-heading" className="section-label">{t('equalizer')}</h2>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
              100Hz · 1kHz · 8kHz 獨立增益
            </p>
          </div>
        </div>
        <button
          className="control-reset"
          type="button"
          onClick={() => onChange({ low: 0, mid: 0, high: 0 })}
          disabled={disabled || isFlat}
          aria-label={t('reset')}
        >
          <RotateCcw size={16} />
        </button>
      </div>

      <div className="eq-bands-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px' }}>
        {(['low', 'mid', 'high'] as const).map((band) => {
          const label = band === 'low' ? '低音 Low' : band === 'mid' ? '中音 Mid' : '高音 High';
          const freq = band === 'low' ? '100Hz' : band === 'mid' ? '1kHz' : '8kHz';
          const val = equalizer[band];
          return (
            <EqBandColumn
              key={band}
              band={band}
              label={label}
              freq={freq}
              val={val}
              disabled={disabled}
              wheelControl={wheelControl}
              onChange={handleBandChange}
            />
          );
        })}
      </div>

      <div className="quick-options" style={{ marginTop: '10px' }}>
        <button
          className={isFlat ? 'is-selected' : ''}
          type="button"
          disabled={disabled}
          onClick={() => onChange({ low: 0, mid: 0, high: 0 })}
        >
          原音 Flat
        </button>
        <button
          className={equalizer.low === -2 && equalizer.mid === 4 && equalizer.high === 2 ? 'is-selected' : ''}
          type="button"
          disabled={disabled}
          onClick={() => onChange({ low: -2, mid: 4, high: 2 })}
        >
          人聲增強
        </button>
        <button
          className={equalizer.low === 6 && equalizer.mid === 0 && equalizer.high === -2 ? 'is-selected' : ''}
          type="button"
          disabled={disabled}
          onClick={() => onChange({ low: 6, mid: 0, high: -2 })}
        >
          重低音
        </button>
      </div>
    </section>
  );
}
