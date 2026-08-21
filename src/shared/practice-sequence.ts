import { clamp, MAX_SPEED, MIN_SPEED } from './audio';
import type { PracticeSequenceStep } from './protocol';

export interface PracticeSequenceRun {
  steps: PracticeSequenceStep[];
  stepIndex: number;
  repetitionsCompleted: number;
  originalSpeed: number;
  running: boolean;
  completed: boolean;
}

export type PracticeSequenceAdvance =
  | 'repeat-step'
  | 'advance-step'
  | 'complete';

export function normalizePracticeSequenceSteps(
  steps: PracticeSequenceStep[],
): PracticeSequenceStep[] {
  return steps
    .map((step) => ({
      speed: Math.round(clamp(Number(step.speed), MIN_SPEED, MAX_SPEED) * 100) / 100,
      reps: Math.round(clamp(Number(step.reps), 1, 20)),
    }))
    .filter((step) => Number.isFinite(step.speed) && Number.isFinite(step.reps));
}

export function createPracticeSequenceRun(
  steps: PracticeSequenceStep[],
  originalSpeed: number,
): PracticeSequenceRun | null {
  const normalized = normalizePracticeSequenceSteps(steps);
  if (normalized.length === 0) {
    return null;
  }

  return {
    steps: normalized,
    stepIndex: 0,
    repetitionsCompleted: 0,
    originalSpeed: Math.round(clamp(originalSpeed, MIN_SPEED, MAX_SPEED) * 100) / 100,
    running: true,
    completed: false,
  };
}

/** Advance once when the current A–B loop wraps from B back to A. */
export function advancePracticeSequenceRun(
  run: PracticeSequenceRun,
): { run: PracticeSequenceRun; action: PracticeSequenceAdvance } {
  if (!run.running || run.completed) {
    return { run, action: 'complete' };
  }

  const current = run.steps[run.stepIndex];
  if (!current) {
    return {
      run: { ...run, running: false, completed: true },
      action: 'complete',
    };
  }

  const nextRepetition = run.repetitionsCompleted + 1;
  if (nextRepetition < current.reps) {
    return {
      run: { ...run, repetitionsCompleted: nextRepetition },
      action: 'repeat-step',
    };
  }

  if (run.stepIndex < run.steps.length - 1) {
    return {
      run: { ...run, stepIndex: run.stepIndex + 1, repetitionsCompleted: 0 },
      action: 'advance-step',
    };
  }

  return {
    run: { ...run, running: false, completed: true },
    action: 'complete',
  };
}
