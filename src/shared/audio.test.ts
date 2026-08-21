import { describe, expect, it } from 'vitest';
import { formatSignedSemitones, formatTime, semitoneToRatio, toPercent } from './audio';

describe('semitoneToRatio', () => {
  it('maps one octave up and down to exact ratios', () => {
    expect(semitoneToRatio(12)).toBe(2);
    expect(semitoneToRatio(-12)).toBe(0.5);
  });

  it('maps seven semitones to the equal-temperament ratio', () => {
    expect(semitoneToRatio(7)).toBeCloseTo(1.498307, 6);
  });

  it('maps C up one key to C-sharp and two keys to D intervals', () => {
    expect(semitoneToRatio(1)).toBeCloseTo(2 ** (1 / 12), 12);
    expect(semitoneToRatio(2)).toBeCloseTo(2 ** (2 / 12), 12);
  });

  it('adds cents independently from semitones', () => {
    expect(semitoneToRatio(0, 100)).toBeCloseTo(2 ** (1 / 12), 10);
  });
});

describe('format helpers', () => {
  it('formats signed semitones without negative zero', () => {
    expect(formatSignedSemitones(-0)).toBe('0');
    expect(formatSignedSemitones(2)).toBe('+2');
  });

  it('formats regular and tenths timestamps', () => {
    expect(formatTime(70.24)).toBe('01:10');
    expect(formatTime(70.24, true)).toBe('01:10.2');
  });

  it('guards invalid progress inputs', () => {
    expect(toPercent(10, 0)).toBe(0);
    expect(toPercent(10, 20)).toBe(50);
  });
});
