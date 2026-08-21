import fs from 'node:fs';

const sampleRate = 44100;
const duration = 10; // 10 seconds is optimal for all smoke test stages
const numSamples = sampleRate * duration;
const bytesPerSample = 2; // 16-bit mono
const blockAlign = bytesPerSample;
const byteRate = sampleRate * blockAlign;
const dataSize = numSamples * bytesPerSample;

const buffer = Buffer.alloc(44 + dataSize);

// RIFF chunk descriptor
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);

// fmt sub-chunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // subchunk1size (16 for PCM)
buffer.writeUInt16LE(1, 20);  // audioFormat (1 for PCM)
buffer.writeUInt16LE(1, 22);  // numChannels (1 for mono)
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34); // bitsPerSample

// data sub-chunk
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Generate 440Hz sine wave
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const sample = Math.sin(2 * Math.PI * 440 * t);
  const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767 * 0.8)));
  buffer.writeInt16LE(int16, 44 + i * 2);
}

fs.writeFileSync('qa/tone-440.wav', buffer);
console.log(`Generated compact qa/tone-440.wav (${(buffer.length / 1024).toFixed(1)} KB)`);
