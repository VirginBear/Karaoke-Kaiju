import { Activity, Minus, Plus, RotateCcw, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TapTempoCalculator } from '../../shared/bpm';
import type { BpmAnalysisResult } from '../../shared/protocol';
import { useI18n } from '../i18n';

interface BpmSectionProps {
  disabled?: boolean;
  onAutoDetect?: (sampleSeconds?: number) => Promise<BpmAnalysisResult>;
}

export function BpmSection({ disabled = false, onAutoDetect }: BpmSectionProps) {
  const { t } = useI18n();
  const [bpm, setBpm] = useState<number>(120);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [detectedNotice, setDetectedNotice] = useState<string | null>(null);
  const tapCalculatorRef = useRef(new TapTempoCalculator(8, 2500));
  const audioContextRef = useRef<AudioContext | null>(null);

  // Metronome pulse interval
  useEffect(() => {
    if (bpm <= 0) return;
    const intervalMs = (60 / bpm) * 1000;
    const timer = setInterval(() => {
      setCurrentBeat((prev) => {
        const next = (prev + 1) % 4;
        if (soundEnabled) {
          playClick(next === 0);
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [bpm, soundEnabled]);

  const playClick = (accent: boolean) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') void ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(accent ? 1200 : 800, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  };

  const handleTap = () => {
    const calculatedBpm = tapCalculatorRef.current.tap();
    if (calculatedBpm) {
      setBpm(calculatedBpm);
      setDetectedNotice(null);
    }
  };

  const handleAutoDetect = async () => {
    if (!onAutoDetect) {
      setDetectedNotice('目前環境沒有可用的音訊分析器');
      return;
    }
    setIsDetecting(true);
    setDetectedNotice('正在擷取目前歌曲的節奏包絡，約需 8 秒…');
    try {
      const result = await onAutoDetect(8);
      setBpm(result.bpm);
      setDetectedNotice(
        `⚡ 自動偵測完成：${result.bpm} BPM · 信心度 ${Math.round(result.confidence * 100)}%（可用 TAP 或 ± 微調）`,
      );
    } catch (error) {
      setDetectedNotice(error instanceof Error ? error.message : 'BPM 自動偵測失敗，請改用 TAP 測速');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleBpmChange = (delta: number) => {
    setBpm((prev) => Math.max(30, Math.min(300, prev + delta)));
  };

  return (
    <section className="tool-section control-card bpm-section" aria-labelledby="bpm-heading">
      <div className="control-card-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} />
          <div>
            <h2 id="bpm-heading" className="section-label">BPM 節奏與節拍器</h2>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
              自動偵測 · Tap 測速 · 4/4 拍視覺脈衝
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="control-reset"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? '靜音節拍器' : '開啟節拍聲音'}
          >
            {soundEnabled ? <Volume2 size={16} color="#0A84FF" /> : <VolumeX size={16} />}
          </button>
          <button
            type="button"
            className="control-reset"
            onClick={() => {
              setBpm(120);
              tapCalculatorRef.current.reset();
              setDetectedNotice(null);
            }}
            title={t('reset')}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{bpm}</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>BPM</span>
        </div>

        {/* Visual 4-beat pulse indicators */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {[0, 1, 2, 3].map((beatIndex) => {
            const isCurrent = currentBeat === beatIndex;
            const isDownbeat = beatIndex === 0;
            return (
              <div
                key={beatIndex}
                style={{
                  width: isDownbeat ? '14px' : '10px',
                  height: isDownbeat ? '14px' : '10px',
                  borderRadius: '50%',
                  background: isCurrent
                    ? isDownbeat
                      ? '#EF4444'
                      : '#0A84FF'
                    : 'rgba(255, 255, 255, 0.15)',
                  boxShadow: isCurrent ? `0 0 10px ${isDownbeat ? '#EF4444' : '#0A84FF'}` : 'none',
                  transition: 'all 0.08s ease',
                }}
              />
            );
          })}
        </div>
      </div>

      {detectedNotice ? (
        <div style={{ fontSize: '11.5px', color: '#0A84FF', background: 'var(--surface-selected)', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px' }}>
          {detectedNotice}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr', gap: '6px' }}>
        <button
          type="button"
          className="step-button"
          style={{ width: '100%', height: '36px' }}
          onClick={() => handleBpmChange(-1)}
          disabled={disabled || isDetecting}
          title="減少 1 BPM"
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          className="step-button"
          style={{ width: '100%', height: '36px' }}
          onClick={() => handleBpmChange(1)}
          disabled={disabled || isDetecting}
          title="增加 1 BPM"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          style={{
            height: '36px',
            fontWeight: 700,
            fontSize: '12px',
            background: 'var(--surface-selected)',
            color: 'var(--accent)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
          onClick={handleAutoDetect}
          disabled={disabled || isDetecting || !onAutoDetect}
        >
          <Sparkles size={14} />
          {isDetecting ? '偵測中...' : '自動偵測'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{
            height: '36px',
            fontWeight: 700,
            fontSize: '12px',
            background: '#0A84FF',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          onClick={handleTap}
          disabled={disabled || isDetecting}
        >
          👆 TAP 測速
        </button>
      </div>
    </section>
  );
}
