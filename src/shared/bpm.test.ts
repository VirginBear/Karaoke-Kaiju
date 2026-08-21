import { describe, expect, it } from 'vitest';
import { estimateBpmFromEnvelope } from './bpm';

describe('estimateBpmFromEnvelope', () => {
  it('detects a stable 120 BPM pulse from a sampled energy envelope', () => {
    const sampleRate = 20;
    const envelope = new Float32Array(sampleRate * 12);
    for (let index = 0; index < envelope.length; index += 1) {
      const phase = index % 10;
      envelope[index] = phase === 0 ? 1 : phase === 1 ? 0.55 : 0.08;
    }

    const estimate = estimateBpmFromEnvelope(envelope, sampleRate);
    expect(estimate).not.toBeNull();
    expect(estimate?.bpm).toBe(120);
    expect(estimate?.confidence).toBeGreaterThan(0.3);
  });

  it('returns null when the sample is too short or silent', () => {
    expect(estimateBpmFromEnvelope(new Float32Array(20), 20)).toBeNull();
    expect(estimateBpmFromEnvelope(new Float32Array(120), 20)).toBeNull();
  });
});
