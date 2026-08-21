import { describe, expect, it } from 'vitest';
import { getReleasePolicy } from './release-channel';

describe('release channel policy', () => {
  it('keeps the public 0.1.0 build limited to verified practice features', () => {
    expect(getReleasePolicy('public')).toEqual({
      modules: ['key', 'finePitch', 'speed', 'loop'],
      googleDrive: false,
      groqLyrics: false,
      varispeed: false,
      extendedKeyRange: false,
    });
  });

  it('keeps experimental work available in development builds', () => {
    expect(getReleasePolicy('development')).toEqual({
      modules: ['key', 'finePitch', 'speed', 'loop', 'bpm', 'vocalReducer', 'equalizer'],
      googleDrive: true,
      groqLyrics: true,
      varispeed: true,
      extendedKeyRange: true,
    });
  });
});
