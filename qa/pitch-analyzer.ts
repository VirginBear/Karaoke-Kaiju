import { processOffline } from '@soundtouchjs/formant-correction-worklet';
import formantProcessorUrl from '@soundtouchjs/formant-correction-worklet/processor?url';
import { semitoneToRatio } from '../src/shared/audio';

interface PitchMeasurement {
  semitones: number;
  expectedHz: number;
  measuredHz: number;
  centsError: number;
}

declare global {
  interface Window {
    pitchAccuracyPromise: Promise<PitchMeasurement[]>;
  }
}

const SAMPLE_RATE = 48_000;
const SOURCE_FREQUENCY = 440;
const DURATION_SECONDS = 4;

window.pitchAccuracyPromise = runPitchAccuracyTest();

async function runPitchAccuracyTest(): Promise<PitchMeasurement[]> {
  const results: PitchMeasurement[] = [];

  for (const semitones of [-12, -7, -2, 0, 2, 7, 12]) {
    const input = createSineBuffer(SOURCE_FREQUENCY);
    const rendered = await processOffline({
      input,
      processorUrl: formantProcessorUrl,
      pitchSemitones: semitones,
      formantStrength: 1,
      stretchParameters: { overlapMs: 12, quickSeek: false },
    });
    const expectedHz = SOURCE_FREQUENCY * semitoneToRatio(semitones);
    const measuredHz = estimateFrequency(rendered.getChannelData(0), SAMPLE_RATE, expectedHz);
    const centsError = 1200 * Math.log2(measuredHz / expectedHz);
    results.push({ semitones, expectedHz, measuredHz, centsError });
  }

  const status = document.querySelector('#status');
  if (status) {
    status.textContent = JSON.stringify(results);
  }
  return results;
}

function createSineBuffer(frequency: number): AudioBuffer {
  const length = SAMPLE_RATE * DURATION_SECONDS;
  const buffer = new AudioBuffer({ length, numberOfChannels: 1, sampleRate: SAMPLE_RATE });
  const channel = buffer.getChannelData(0);

  for (let frame = 0; frame < length; frame += 1) {
    const fadeIn = Math.min(1, frame / (SAMPLE_RATE * 0.02));
    const fadeOut = Math.min(1, (length - frame - 1) / (SAMPLE_RATE * 0.02));
    channel[frame] = Math.sin((2 * Math.PI * frequency * frame) / SAMPLE_RATE) * fadeIn * fadeOut * 0.5;
  }
  return buffer;
}

function estimateFrequency(samples: Float32Array, sampleRate: number, expectedHz: number): number {
  const start = Math.min(samples.length - 1, Math.floor(sampleRate * 1.2));
  const windowLength = Math.min(Math.floor(sampleRate * 1.5), samples.length - start - 1);
  const minimumLag = Math.floor(sampleRate / (expectedHz * 1.12));
  const maximumLag = Math.ceil(sampleRate / (expectedHz * 0.88));
  const correlations: number[] = [];

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let cross = 0;
    let energyA = 0;
    let energyB = 0;
    for (let index = 0; index < windowLength; index += 1) {
      const a = samples[start + index];
      const b = samples[start + index + lag];
      cross += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    correlations.push(cross / Math.sqrt(energyA * energyB));
  }

  let peakIndex = 0;
  for (let index = 1; index < correlations.length; index += 1) {
    if (correlations[index] > correlations[peakIndex]) {
      peakIndex = index;
    }
  }

  let fractionalOffset = 0;
  if (peakIndex > 0 && peakIndex < correlations.length - 1) {
    const left = correlations[peakIndex - 1];
    const center = correlations[peakIndex];
    const right = correlations[peakIndex + 1];
    const denominator = left - 2 * center + right;
    if (Math.abs(denominator) > 1e-12) {
      fractionalOffset = 0.5 * (left - right) / denominator;
    }
  }

  const estimatedLag = minimumLag + peakIndex + fractionalOffset;
  return sampleRate / estimatedLag;
}
