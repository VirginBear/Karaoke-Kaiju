import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaState, PracticeSequenceStep } from '../shared/protocol';
import {
  advancePracticeSequenceRun,
  createPracticeSequenceRun,
  type PracticeSequenceRun,
} from '../shared/practice-sequence';

interface UsePracticeSequenceOptions {
  media: MediaState;
  runMediaCommand: (command: { kind: 'SET_SPEED'; speed: number } | { kind: 'TOGGLE_LOOP' }) => Promise<void>;
}

export function usePracticeSequence({ media, runMediaCommand }: UsePracticeSequenceOptions) {
  const [sequence, setSequence] = useState<PracticeSequenceRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previousTimeRef = useRef(media.currentTime);

  const startSequence = useCallback(async (steps: PracticeSequenceStep[]) => {
    try {
      if (media.loop.start === null || media.loop.end === null || media.loop.end <= media.loop.start) {
        throw new Error('請先設定有效的 A–B 段落，再開始階梯練習');
      }

      const run = createPracticeSequenceRun(steps, media.playbackRate);
      if (!run) {
        throw new Error('請至少保留一個階梯練習階段');
      }

      setError(null);
      if (!media.loop.enabled) {
        await runMediaCommand({ kind: 'TOGGLE_LOOP' });
      }
      await runMediaCommand({ kind: 'SET_SPEED', speed: run.steps[0].speed });
      previousTimeRef.current = media.currentTime;
      setSequence(run);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '無法開始階梯練習');
    }
  }, [media.currentTime, media.loop.end, media.loop.enabled, media.loop.start, media.playbackRate, runMediaCommand]);

  const cancelSequence = useCallback(async () => {
    const current = sequence;
    if (!current) return;
    await runMediaCommand({ kind: 'SET_SPEED', speed: current.originalSpeed });
    setSequence(null);
    setError(null);
  }, [runMediaCommand, sequence]);

  useEffect(() => {
    const previousTime = previousTimeRef.current;
    previousTimeRef.current = media.currentTime;

    if (!sequence?.running || media.paused || media.loop.start === null || media.loop.end === null) {
      return;
    }

    const wrapped = previousTime > media.loop.end - 0.35 && media.currentTime <= media.loop.start + 0.35;
    if (!wrapped) return;

    const advanced = advancePracticeSequenceRun(sequence);
    setSequence(advanced.run);

    if (advanced.action === 'advance-step') {
      void runMediaCommand({ kind: 'SET_SPEED', speed: advanced.run.steps[advanced.run.stepIndex].speed });
    } else if (advanced.action === 'complete') {
      void runMediaCommand({ kind: 'SET_SPEED', speed: advanced.run.originalSpeed });
    }
  }, [media.currentTime, media.loop.end, media.loop.start, media.paused, runMediaCommand, sequence]);

  useEffect(() => {
    setSequence(null);
    previousTimeRef.current = media.currentTime;
  }, [media.url]);

  return { sequence, error, startSequence, cancelSequence };
}
