import { MicOff, Music, RotateCcw, Volume2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useI18n } from '../i18n';
import { useWheelControl } from '../useWheelControl';

export interface VocalMix {
  musicVolume: number; // 0.0 ~ 2.0
  vocalVolume: number; // 0.0 ~ 2.0
}

interface VocalReducerSectionProps {
  mix: VocalMix;
  disabled: boolean;
  wheelControl?: boolean;
  onChange: (mix: VocalMix) => void;
}

const PRESETS: { label: string; mix: VocalMix }[] = [
  { label: '原唱', mix: { musicVolume: 1.0, vocalVolume: 1.0 } },
  { label: '導唱 50%', mix: { musicVolume: 1.0, vocalVolume: 0.5 } },
  { label: '純伴奏', mix: { musicVolume: 1.0, vocalVolume: 0.0 } },
  { label: '人聲加強', mix: { musicVolume: 0.5, vocalVolume: 1.5 } },
];

function isPresetMatch(mix: VocalMix, preset: VocalMix): boolean {
  return Math.abs(mix.musicVolume - preset.musicVolume) < 0.03 &&
    Math.abs(mix.vocalVolume - preset.vocalVolume) < 0.03;
}

function VolumeSlider({
  label,
  icon,
  percent,
  value,
  field,
  disabled,
  wheelControl,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  percent: number;
  value: number;
  field: 'musicVolume' | 'vocalVolume';
  disabled: boolean;
  wheelControl: boolean;
  onChange: (field: 'musicVolume' | 'vocalVolume', value: number) => void;
}) {
  const rowRef = useWheelControl<HTMLDivElement>({
    enabled: wheelControl,
    disabled,
    onDelta: (dir, isShift) => {
      const step = isShift ? 0.1 : 0.05;
      const next = dir > 0
        ? Math.min(2, Math.round((value + step) * 100) / 100)
        : Math.max(0, Math.round((value - step) * 100) / 100);
      onChange(field, next);
    },
  });

  return (
    <div ref={rowRef} style={{ marginBottom: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {icon} {label}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {percent}%
        </span>
      </div>
      <input
        aria-label={`${label}音量`}
        aria-valuetext={`${percent}%`}
        className="range-control"
        type="range"
        min={0}
        max={2}
        step={0.05}
        value={value}
        disabled={disabled}
        style={{ '--range-progress': `${percent / 2}%` } as CSSProperties}
        onChange={(e) => onChange(field, Number(e.currentTarget.value))}
      />
    </div>
  );
}

export function VocalReducerSection({
  mix,
  disabled,
  wheelControl = true,
  onChange,
}: VocalReducerSectionProps) {
  const { t } = useI18n();
  const musicPercent = Math.round(mix.musicVolume * 100);
  const vocalPercent = Math.round(mix.vocalVolume * 100);
  const isDefault = mix.musicVolume === 1.0 && mix.vocalVolume === 1.0;

  const handleSliderChange = (field: 'musicVolume' | 'vocalVolume', value: number) => {
    onChange({ ...mix, [field]: value });
  };

  return (
    <section
      className="tool-section control-card vocal-reducer-section"
      aria-labelledby="vocal-reducer-heading"
    >
      <div className="control-card-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MicOff size={18} />
          <div>
            <h2 id="vocal-reducer-heading" className="section-label">{t('vocalReducer')}</h2>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
              Mid-Side 矩陣編解碼 · 雙軌獨立音量控制
            </p>
          </div>
        </div>
        <button
          className="control-reset"
          type="button"
          onClick={() => onChange({ musicVolume: 1.0, vocalVolume: 1.0 })}
          disabled={disabled || isDefault}
          aria-label={t('reset')}
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Dual Stem Balance Display */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '10px 0 8px' }}>
        <div
          style={{
            background: 'var(--surface-subtle, rgba(255,255,255,0.04))',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <Music size={12} /> 伴奏音量
          </div>
          <div style={{
            fontSize: '15px',
            fontWeight: 750,
            color: musicPercent === 100 ? 'var(--text-primary)' : musicPercent > 100 ? '#30D158' : '#FF9F0A',
            marginTop: '2px',
          }}>
            {musicPercent}%
          </div>
        </div>
        <div
          style={{
            background: 'var(--surface-subtle, rgba(255,255,255,0.04))',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <Volume2 size={12} /> 人聲音量
          </div>
          <div style={{
            fontSize: '15px',
            fontWeight: 750,
            color: vocalPercent === 100 ? 'var(--text-primary)' : vocalPercent === 0 ? 'var(--text-muted)' : vocalPercent > 100 ? '#0A84FF' : '#FF9F0A',
            marginTop: '2px',
          }}>
            {vocalPercent}%
          </div>
        </div>
      </div>

      {/* Music Volume Slider */}
      <VolumeSlider
        label="伴奏"
        icon={<Music size={11} />}
        percent={musicPercent}
        value={mix.musicVolume}
        field="musicVolume"
        disabled={disabled}
        wheelControl={wheelControl}
        onChange={handleSliderChange}
      />

      {/* Vocal Volume Slider */}
      <VolumeSlider
        label="人聲"
        icon={<Volume2 size={11} />}
        percent={vocalPercent}
        value={mix.vocalVolume}
        field="vocalVolume"
        disabled={disabled}
        wheelControl={wheelControl}
        onChange={handleSliderChange}
      />

      {/* Preset Buttons */}
      <div className="quick-options" style={{ marginTop: '10px' }}>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            className={isPresetMatch(mix, preset.mix) ? 'is-selected' : ''}
            type="button"
            disabled={disabled}
            onClick={() => onChange(preset.mix)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}
