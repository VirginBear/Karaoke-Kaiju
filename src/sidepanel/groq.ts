import { GROQ_ORIGIN, requestGroqTranscription } from '../shared/groq';
import type { GroqTranscription } from '../shared/lyrics';
import { isExtensionRuntime } from './client';

export async function ensureGroqPermission(): Promise<void> {
  if (!isExtensionRuntime()) return;
  const granted = await chrome.permissions.request({ origins: [GROQ_ORIGIN] });
  if (!granted) {
    throw new Error('需要允許連線 Groq，才能上傳音訊進行 AI 對時');
  }
}

export async function transcribeAudioWithGroq(options: {
  apiKey: string;
  file: File;
  songContext: string;
}): Promise<GroqTranscription> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new Error('請輸入 Groq API Key');
  }

  await ensureGroqPermission();
  return requestGroqTranscription({
    apiKey,
    file: options.file,
    fileName: options.file.name,
    songContext: options.songContext,
  });
}
