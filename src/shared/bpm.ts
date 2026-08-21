/**
 * BPM & Tap Tempo utility for Diaochang
 */

export class TapTempoCalculator {
  private taps: number[] = [];
  private readonly maxTaps: number;
  private readonly timeoutMs: number;

  constructor(maxTaps = 8, timeoutMs = 2500) {
    this.maxTaps = maxTaps;
    this.timeoutMs = timeoutMs;
  }

  public tap(): number | null {
    const now = performance.now();

    // Reset if too long since last tap
    if (this.taps.length > 0 && now - this.taps[this.taps.length - 1] > this.timeoutMs) {
      this.taps = [];
    }

    this.taps.push(now);
    if (this.taps.length > this.maxTaps) {
      this.taps.shift();
    }

    if (this.taps.length < 2) {
      return null;
    }

    // Calculate average interval between consecutive taps
    let totalInterval = 0;
    for (let i = 1; i < this.taps.length; i++) {
      totalInterval += this.taps[i] - this.taps[i - 1];
    }
    const avgIntervalMs = totalInterval / (this.taps.length - 1);

    if (avgIntervalMs <= 0) return null;

    const bpm = Math.round(60000 / avgIntervalMs);
    return Math.max(30, Math.min(300, bpm));
  }

  public reset(): void {
    this.taps = [];
  }

  public getTapCount(): number {
    return this.taps.length;
  }
}

export interface BpmEstimate {
  bpm: number;
  confidence: number;
}

/**
 * Estimate tempo from a low-rate energy envelope. The envelope is normally
 * produced by sampling an AnalyserNode's RMS level around 20 times per second.
 * Autocorrelation keeps the detector independent from the current pitch/key
 * processing and works with music that has no clean isolated kick track.
 */
export function estimateBpmFromEnvelope(
  envelope: Float32Array | number[],
  sampleRate: number,
): BpmEstimate | null {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || envelope.length < sampleRate * 4) {
    return null;
  }

  const values = Array.from(envelope, (value) => (Number.isFinite(value) ? Math.max(0, value) : 0));
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const centered = values.map((value) => value - mean);
  const energy = Math.sqrt(centered.reduce((sum, value) => sum + value * value, 0));
  if (energy < 1e-6) {
    return null;
  }

  const minBpm = 40;
  const maxBpm = 220;
  const minLag = Math.max(1, Math.floor((sampleRate * 60) / maxBpm));
  const maxLag = Math.min(
    Math.floor((sampleRate * 60) / minBpm),
    Math.floor(centered.length / 2),
  );

  let bestLag = 0;
  let bestCorrelation = -1;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let numerator = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    for (let index = lag; index < centered.length; index += 1) {
      const left = centered[index];
      const right = centered[index - lag];
      numerator += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }
    const denominator = Math.sqrt(leftEnergy * rightEnergy);
    const correlation = denominator > 1e-9 ? numerator / denominator : -1;
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }

  if (!bestLag || bestCorrelation < 0.08) {
    return null;
  }

  let bpm = (sampleRate * 60) / bestLag;
  // Prefer the musical pulse range when the autocorrelation locks to a
  // half-time or double-time harmonic.
  while (bpm < 70) bpm *= 2;
  while (bpm > 180) bpm /= 2;

  return {
    bpm: Math.round(Math.max(40, Math.min(220, bpm))),
    confidence: Math.max(0, Math.min(1, bestCorrelation)),
  };
}

/**
 * Estimate BPM from audio time domain buffer or peaks
 */
export function estimateBpmFromBuffer(channelData: Float32Array, sampleRate: number): number | null {
  if (channelData.length < sampleRate * 2) {
    return null; // Need at least 2 seconds of audio
  }

  // Downsample to ~2000 Hz for peak detection
  const downsampleRatio = Math.max(1, Math.floor(sampleRate / 2000));
  const downsampledLength = Math.floor(channelData.length / downsampleRatio);
  const envelope = new Float32Array(downsampledLength);

  let peakEnergy = 0;
  for (let i = 0; i < downsampledLength; i++) {
    const val = Math.abs(channelData[i * downsampleRatio]);
    envelope[i] = val;
    if (val > peakEnergy) peakEnergy = val;
  }

  if (peakEnergy < 0.05) return null;

  // Threshold peak detection
  const threshold = peakEnergy * 0.6;
  const peaks: number[] = [];
  const minInterval = (2000 * 60) / 220; // Max 220 BPM
  let lastPeak = -minInterval;

  for (let i = 0; i < downsampledLength; i++) {
    if (envelope[i] > threshold && i - lastPeak > minInterval) {
      peaks.push(i);
      lastPeak = i;
    }
  }

  if (peaks.length < 4) return null;

  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  const estimatedBpm = Math.round((2000 * 60) / medianInterval);

  return Math.max(40, Math.min(220, estimatedBpm));
}
