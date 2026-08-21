import { describe, expect, it } from 'vitest';
import {
  advancePracticeSequenceRun,
  createPracticeSequenceRun,
  normalizePracticeSequenceSteps,
} from './practice-sequence';

describe('practice sequence', () => {
  it('normalizes speed and repetition limits', () => {
    expect(normalizePracticeSequenceSteps([
      { speed: 0.1, reps: 0 },
      { speed: 2.345, reps: 21 },
    ])).toEqual([
      { speed: 0.25, reps: 1 },
      { speed: 2.35, reps: 20 },
    ]);
  });

  it('advances repetitions, steps, then completes', () => {
    const initial = createPracticeSequenceRun(
      [{ speed: 0.75, reps: 2 }, { speed: 1, reps: 1 }],
      1.25,
    );
    expect(initial).not.toBeNull();
    if (!initial) return;

    const first = advancePracticeSequenceRun(initial);
    expect(first.action).toBe('repeat-step');
    expect(first.run.repetitionsCompleted).toBe(1);

    const second = advancePracticeSequenceRun(first.run);
    expect(second.action).toBe('advance-step');
    expect(second.run.stepIndex).toBe(1);
    expect(second.run.repetitionsCompleted).toBe(0);

    const final = advancePracticeSequenceRun(second.run);
    expect(final.action).toBe('complete');
    expect(final.run.running).toBe(false);
    expect(final.run.completed).toBe(true);
    expect(final.run.originalSpeed).toBe(1.25);
  });

  it('does not create a run without valid steps', () => {
    expect(createPracticeSequenceRun([], 1)).toBeNull();
  });
});
