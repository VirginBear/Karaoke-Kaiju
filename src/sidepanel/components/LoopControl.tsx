import { BookmarkPlus, MapPin, Play, Repeat2, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { formatTime, toPercent } from '../../shared/audio';
import type { LoopClip, LoopState } from '../../shared/protocol';
import { useI18n } from '../i18n';

interface LoopControlProps {
  loop: LoopState;
  duration: number;
  disabled: boolean;
  onSetPoint: (point: 'start' | 'end') => void;
  onToggle: () => void;
  onClear: () => void;
  onSelectClip?: (clip: LoopClip) => void;
  onSaveClip?: (name: string) => void;
  onDeleteClip?: (clipId: string) => void;
  onStartSequence?: (steps: { speed: number; reps: number }[]) => void;
}

const WAVE_HEIGHTS = [
  24, 31, 18, 28, 38, 22, 32, 44, 25, 18, 35, 29, 46, 23, 37, 50, 28, 19, 33, 43, 26, 38,
  21, 47, 30, 18, 39, 27, 45, 31, 20, 36, 49, 24, 34, 42, 26, 19, 40, 29, 45, 23, 37, 32,
  48, 21, 35, 27,
];

export function LoopControl({
  loop,
  duration,
  disabled,
  onSetPoint,
  onToggle,
  onClear,
  onSelectClip,
  onSaveClip,
  onDeleteClip,
}: LoopControlProps) {
  const { t } = useI18n();
  const [newClipName, setNewClipName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const startPercent = toPercent(loop.start ?? 0, duration);
  const endPercent = toPercent(loop.end ?? duration, duration);
  const selectionWidth = Math.max(0, endPercent - startPercent);
  const canLoop = loop.start !== null && loop.end !== null && loop.end - loop.start >= 0.5;

  const clips = loop.clips ?? [];

  const handleSaveClipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canLoop) return;
    onSaveClip?.(newClipName.trim() || `片段 ${clips.length + 1}`);
    setNewClipName('');
    setShowAddForm(false);
  };

  return (
    <section className="tool-section control-card loop-section" aria-labelledby="loop-heading">
      <div className="section-heading-row">
        <h2 id="loop-heading" className="section-label">
          {t('loopTitle')}
        </h2>
        <span className={`loop-state ${loop.enabled ? 'loop-state--active' : ''}`}>
          <Repeat2 size={14} />
          {loop.enabled ? t('loopOn') : t('loopOff')}
        </span>
      </div>

      <div className="loop-timeline" aria-label={t('loopTimeline')}>
        <div className="timeline-labels">
          <span>0:00</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="waveform-rail" aria-hidden="true">
          <span
            className="loop-selection"
            style={{ left: `${startPercent}%`, width: `${selectionWidth}%` }}
          />
          {WAVE_HEIGHTS.map((height, index) => (
            <i key={`${height}-${index}`} style={{ height: `${height}%` }} />
          ))}
          {loop.start !== null ? <span className="loop-marker loop-marker--a" style={{ left: `${startPercent}%` }}>A</span> : null}
          {loop.end !== null ? <span className="loop-marker loop-marker--b" style={{ left: `${endPercent}%` }}>B</span> : null}
        </div>
      </div>

      <div className="loop-time-values">
        <output>{formatTime(loop.start ?? Number.NaN, true)}</output>
        <span>—</span>
        <output>{formatTime(loop.end ?? Number.NaN, true)}</output>
      </div>

      <div className="loop-actions">
        <button type="button" className="outline-button" onClick={() => onSetPoint('start')} disabled={disabled}>
          <MapPin size={15} />{t('setA')}
        </button>
        <button type="button" className="outline-button" onClick={() => onSetPoint('end')} disabled={disabled}>
          <MapPin size={15} />{t('setB')}
        </button>
        <button type="button" className={`loop-button ${loop.enabled ? 'is-active' : ''}`} onClick={onToggle} disabled={disabled || !canLoop}>
          {loop.enabled ? <RotateCcw size={15} /> : <Repeat2 size={15} />}
          {loop.enabled ? t('looping') : t('loopOn')}
        </button>
        <button type="button" className="secondary-button secondary-button--compact" onClick={onClear} disabled={disabled || (!canLoop && loop.start === null && loop.end === null)}>
          <Trash2 size={15} />{t('clear')}
        </button>
      </div>

      {/* Multiple Loops & Clips section */}
      <div className="loop-clips-container" style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', paddingTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 650, color: 'var(--text-secondary)' }}>
            🔖 循環片段 (Clips & Loops)
          </span>
          {canLoop && !showAddForm ? (
            <button
              type="button"
              className="outline-button"
              style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
              onClick={() => setShowAddForm(true)}
              disabled={disabled}
            >
              <BookmarkPlus size={13} /> 存為片段
            </button>
          ) : null}
        </div>

        {showAddForm ? (
          <form onSubmit={handleSaveClipSubmit} style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="片段名稱（如：副歌高音）"
              value={newClipName}
              onChange={(e) => setNewClipName(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle, #444)',
                background: 'var(--surface-subtle, rgba(0,0,0,0.3))',
                color: 'inherit',
              }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '11.5px' }}>
              儲存
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11.5px' }} onClick={() => setShowAddForm(false)}>
              取消
            </button>
          </form>
        ) : null}

        {clips.length > 0 ? (
          <div className="loop-clips-list" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {clips.map((clip) => {
              const isActive = loop.activeClipId === clip.id;
              return (
                <div
                  key={clip.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: isActive ? 'var(--surface-selected, rgba(10,132,255,0.15))' : 'var(--surface-subtle, rgba(255,255,255,0.04))',
                    border: isActive ? '1px solid rgba(10,132,255,0.4)' : '1px solid transparent',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectClip?.(clip)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      textAlign: 'left',
                      cursor: 'pointer',
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Play size={12} fill={isActive ? '#0A84FF' : 'currentColor'} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{clip.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      ({formatTime(clip.start)} — {formatTime(clip.end)})
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteClip?.(clip.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px 4px' }}
                    title="刪除片段"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
            設定 A-B 點後即可儲存多個自訂練唱區段
          </div>
        )}
      </div>
    </section>
  );
}
