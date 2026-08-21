// Comprehensive offline Traditional <-> Simplified Chinese mapping dictionary and converter
// Optimized for lyrics, song titles, music terminology, and everyday Chinese characters

import { S2T_MAP, T2S_MAP } from './chinese-dict';

export function toTraditional(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += S2T_MAP[char] || char;
  }
  return result;
}

export function toSimplified(text: string): string {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result += T2S_MAP[char] || char;
  }
  return result;
}

export function detectChineseVariant(text: string): 'traditional' | 'simplified' | 'mixed' | 'none' {
  if (!text) return 'none';
  let tCount = 0;
  let sCount = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (T2S_MAP[char] && T2S_MAP[char] !== char) {
      tCount++;
    } else if (S2T_MAP[char] && S2T_MAP[char] !== char) {
      sCount++;
    }
  }

  if (tCount === 0 && sCount === 0) return 'none';
  if (tCount > sCount * 2) return 'traditional';
  if (sCount > tCount * 2) return 'simplified';
  return 'mixed';
}
