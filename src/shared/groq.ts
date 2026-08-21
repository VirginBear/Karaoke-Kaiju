import type { GroqTranscription } from './lyrics';

export const GROQ_ORIGIN = 'https://api.groq.com/*';
export const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
export const GROQ_MAX_AUDIO_BYTES = 25 * 1024 * 1024;

interface GroqErrorResponse {
  error?: { message?: string };
}

export async function requestGroqTranscription(options: {
  apiKey: string;
  file: Blob;
  fileName: string;
  songContext: string;
  signal?: AbortSignal;
}): Promise<GroqTranscription> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new Error('請輸入 Groq API Key');
  }
  if (options.file.size === 0) {
    throw new Error('沒有錄到可傳送的分頁音訊');
  }
  if (options.file.size > GROQ_MAX_AUDIO_BYTES) {
    throw new Error('音訊超過 25 MB，請縮短錄製時間或改用較小的音訊檔');
  }

  const body = new FormData();
  body.append('file', options.file, options.fileName);
  body.append('model', 'whisper-large-v3');
  body.append('language', 'zh');
  body.append('temperature', '0');
  body.append('response_format', 'verbose_json');
  body.append('timestamp_granularities[]', 'segment');
  body.append('timestamp_granularities[]', 'word');
  body.append(
    'prompt',
    `這是華語歌曲演唱。歌曲資訊：${options.songContext}。請保留繁體中文與正確人名。`.slice(0, 220),
  );

  const response = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body,
    signal: options.signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as GroqErrorResponse;
    throw new Error(payload.error?.message ?? `Groq 轉錄失敗（HTTP ${response.status}）`);
  }

  return response.json() as Promise<GroqTranscription>;
}
