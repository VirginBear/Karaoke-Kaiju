import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestGroqTranscription } from './groq';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestGroqTranscription', () => {
  it('sends an ephemeral bearer key and word timestamp request', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(init?.headers).toEqual({ Authorization: 'Bearer test-key-only' });
      expect(init?.body).toBeInstanceOf(FormData);
      const form = init?.body as FormData;
      expect(form.get('model')).toBe('whisper-large-v3');
      expect(form.getAll('timestamp_granularities[]')).toEqual(['segment', 'word']);
      expect((form.get('file') as Blob).size).toBeGreaterThan(0);
      return new Response(JSON.stringify({
        text: '測試',
        language: 'Chinese',
        duration: 1,
        segments: [{ id: 0, start: 0, end: 1, text: '測試' }],
        words: [{ word: '測試', start: 0, end: 1 }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestGroqTranscription({
      apiKey: 'test-key-only',
      file: new Blob(['audio'], { type: 'audio/webm' }),
      fileName: 'tab.webm',
      songContext: '測試歌曲',
    });

    expect(result.words).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('rejects before networking when the key is empty', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(requestGroqTranscription({
      apiKey: ' ',
      file: new Blob(['audio']),
      fileName: 'tab.webm',
      songContext: '測試歌曲',
    })).rejects.toThrow('Groq API Key');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
