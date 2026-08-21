import { describe, expect, it } from 'vitest';
import {
  extractYouTubeVideoId,
  selectOptimalAudioFormat,
  type YouTubeAdaptiveFormat,
} from './youtube-audio';

describe('youtube-audio extractor', () => {
  it('extracts videoId from standard, music, shorts, embed, and youtu.be URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=kPa7bsKwL-c')).toBe('kPa7bsKwL-c');
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=kPa7bsKwL-c&list=PL123&index=2')).toBe('kPa7bsKwL-c');
    expect(extractYouTubeVideoId('https://music.youtube.com/watch?v=kPa7bsKwL-c')).toBe('kPa7bsKwL-c');
    expect(extractYouTubeVideoId('https://youtu.be/kPa7bsKwL-c?t=10')).toBe('kPa7bsKwL-c');
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/kPa7bsKwL-c')).toBe('kPa7bsKwL-c');
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/kPa7bsKwL-c')).toBe('kPa7bsKwL-c');
    expect(extractYouTubeVideoId('https://example.com/other')).toBeNull();
  });

  it('selects optimal lightweight audio format prioritizing Opus itag 250/249/140', () => {
    const formats: YouTubeAdaptiveFormat[] = [
      { itag: 137, mimeType: 'video/mp4', bitrate: 4000000, url: 'https://example.com/v1080' },
      { itag: 140, mimeType: 'audio/mp4; codecs="mp4a.40.2"', bitrate: 128000, url: 'https://example.com/a140' },
      { itag: 251, mimeType: 'audio/webm; codecs="opus"', bitrate: 160000, url: 'https://example.com/a251' },
      { itag: 250, mimeType: 'audio/webm; codecs="opus"', bitrate: 70000, url: 'https://example.com/a250' },
    ];

    const optimal = selectOptimalAudioFormat(formats);
    expect(optimal?.itag).toBe(250);
    expect(optimal?.url).toBe('https://example.com/a250');
  });

  it('filters out non-audio formats and formats without direct url', () => {
    const formats: YouTubeAdaptiveFormat[] = [
      { itag: 137, mimeType: 'video/mp4', bitrate: 4000000, url: 'https://example.com/v1080' },
      { itag: 140, mimeType: 'audio/mp4', bitrate: 128000 }, // no url
    ];

    expect(selectOptimalAudioFormat(formats)).toBeNull();
  });
});
