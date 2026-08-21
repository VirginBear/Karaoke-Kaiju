import { BookmarkPlus, MapPin, Play, Plus, Repeat2, RotateCcw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { formatTime, toPercent } from '../../shared/audio';
import type { LoopClip, LoopState, PracticeSequenceStep } from '../../shared/protocol';
import type { PracticeSequenceRun } from '../../shared/practice-sequence';
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
  onStartSequence?: (steps: PracticeSequenceStep[]) => void;
  onCancelSequence?: () => void;
  sequence?: PracticeSequenceRun | null;
  sequenceError?: string | null;
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
  onStartSequence,
  onCancelSequence,
  sequence,
  sequenceError,
}: LoopControlProps) {
  const { t } = useI18n();
  const [newClipName, setNewClipName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSequenceForm, setShowSequenceForm] = useState(false);
  const [sequenceSteps, setSequenceSteps] = useState<PracticeSequenceStep[]>([
    { speed: 0.75, reps: 2 },
    { speed: 0.9, reps: 2 },
    { speed: 1, reps: 1 },
  ]);

  const startPercent = toPercent(loop.start ?? 0, duration);
  const endPercent = toPercent(loop.end ?? duration, duration);
  const selectionWidth = Math.max(0, endPercent - startPercent);
  const canLoop = loop.start !== null && loop.end !== null && loop.end - loop.start >= 0.5;

  const clips = loop.clips ?? [];
  const sequenceCanStart = canLoop && !sequence?.running && sequenceSteps.length > 0;

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

      <div className="loop-sequence-container" style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))', paddingTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <strong style={{ fontSize: '12px' }}>{t('practiceSequence')}</strong>
            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>{t('practiceSequenceDescription')}</div>
          </div>
          {sequence?.running ? (
            <button type="button" className="secondary-button secondary-button--compact" onClick={onCancelSequence}>
              <X size={14} />{t('stopSequence')}
            </button>
          ) : (
            <button type="button" className="outline-button" onClick={() => setShowSequenceForm((open) => !open)} disabled={disabled}>
              {showSequenceForm ? t('close') : t('editSequence')}
            </button>
          )}
        </div>

        {sequence?.running ? (
          <div role="status" style={{ marginTop: '8px', padding: '7px 9px', borderRadius: '8px', background: 'var(--surface-selected, rgba(10,132,255,0.12))', color: 'var(--text-primary)', fontSize: '11px' }}>
            {t('sequenceProgress', {
              current: sequence.stepIndex + 1,
              total: sequence.steps.length,
              speed: sequence.steps[sequence.stepIndex]?.speed.toFixed(2) ?? '—',
              reps: sequence.repetitionsCompleted + 1,
              max: sequence.steps[sequence.stepIndex]?.reps ?? 1,
            })}
          </div>
        ) : sequence?.completed ? (
          <div role="status" style={{ marginTop: '8px', color: 'var(--text-secondary)', fontSize: '11px' }}>{t('sequenceCompleted')}</div>
        ) : null}
        {sequenceError ? <div role="alert" style={{ marginTop: '8px', color: 'var(--system-red, #ff453a)', fontSize: '11px' }}>{sequenceError}</div> : null}

        {showSequenceForm && !sequence?.running ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {sequenceSteps.map((step, index) => (
              <div key={`sequence-step-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '6px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                  <span>{t('sequenceSpeed')}</span>
                  <input
                    aria-label={`${t('sequenceSpeed')} ${index + 1}`}
                    type="number"
                    min="0.25"
                    max="4"
                    step="0.05"
                    value={step.speed}
                    onChange={(event) => {
                      const speed = Number(event.currentTarget.value);
                      setSequenceSteps((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, speed } : item));
                    }}
                    style={{ width: '58px' }}
                  />×
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                  <span>{t('sequenceReps')}</span>
                  <input
                    aria-label={`${t('sequenceReps')} ${index + 1}`}
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    value={step.reps}
                    onChange={(event) => {
                      const reps = Number(event.currentTarget.value);
                      setSequenceSteps((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, reps } : item));
                    }}
                    style={{ width: '52px' }}
                  />
                </label>
                <button type="button" className="control-reset" aria-label={`${t('removeSequenceStep')} ${index + 1}`} onClick={() => setSequenceSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={sequenceSteps.length <= 1}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
              <button type="button" className="outline-button" onClick={() => setSequenceSteps((current) => [...current, { speed: 1, reps: 1 }])} disabled={sequenceSteps.length >= 8}>
                <Plus size={14} />{t('addSequenceStep')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => onStartSequence?.(sequenceSteps)} disabled={disabled || !sequenceCanStart}>
                <Play size={14} />{t('startSequence')}
              </button>
            </div>
            {!canLoop ? <div style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{t('sequenceNeedsLoop')}</div> : null}
          </div>
        ) : null}
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
