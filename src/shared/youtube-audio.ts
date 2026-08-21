export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/')[2] ?? null;
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/')[2] ?? null;
      }
    }
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1).split('?')[0] || null;
    }
  } catch {
    return null;
  }
  return null;
}

export interface YouTubeAdaptiveFormat {
  itag: number;
  url?: string;
  mimeType: string;
  bitrate: number;
  contentLength?: string;
  approxDurationMs?: string;
  audioQuality?: string;
}

export interface YouTubePlayerResponse {
  streamingData?: {
    adaptiveFormats?: YouTubeAdaptiveFormat[];
    formats?: YouTubeAdaptiveFormat[];
  };
  videoDetails?: {
    title?: string;
    author?: string;
    lengthSeconds?: string;
  };
  playabilityStatus?: {
    status?: string;
    reason?: string;
  };
}

export function selectOptimalAudioFormat(
  formats: YouTubeAdaptiveFormat[],
): YouTubeAdaptiveFormat | null {
  const audioFormats = formats.filter(
    (f) => f.mimeType?.startsWith('audio/') && typeof f.url === 'string' && f.url.length > 0,
  );

  if (audioFormats.length === 0) {
    return null;
  }

  // Preference ranking (smallest file size / best quality for Whisper transcription):
  // 1. itag 250 (Opus ~70kbps - optimal quality/size for Whisper, ~2MB)
  // 2. itag 249 (Opus ~50kbps - ultra lightweight, ~1.5MB)
  // 3. itag 140 (AAC ~128kbps - standard m4a, ~3.5MB)
  // 4. itag 251 (Opus ~160kbps - ~4.5MB)
  const preferenceOrder = [250, 249, 140, 251];

  for (const itag of preferenceOrder) {
    const matched = audioFormats.find((f) => f.itag === itag);
    if (matched) return matched;
  }

  // Fallback: pick smallest audio format by bitrate
  return audioFormats.sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0))[0] ?? null;
}

export async function downloadAudioFormatBlob(
  format: YouTubeAdaptiveFormat,
  videoId: string,
  options?: { signal?: AbortSignal; maxBytes?: number },
): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  if (!format.url) {
    throw new Error('音訊串流缺少有效下載網址');
  }

  const maxBytes = options?.maxBytes ?? 25 * 1024 * 1024;
  const audioHeaders: Record<string, string> = {};
  if (format.contentLength && Number(format.contentLength) > maxBytes) {
    audioHeaders['Range'] = `bytes=0-${maxBytes - 1}`;
  }

  const audioResponse = await fetch(format.url, {
    headers: audioHeaders,
    signal: options?.signal,
  });

  if (!audioResponse.ok && audioResponse.status !== 206) {
    throw new Error(`下載音訊串流失敗 (HTTP ${audioResponse.status})`);
  }

  const blob = await audioResponse.blob();
  const isWebm = format.mimeType.includes('webm') || format.mimeType.includes('opus');
  const ext = isWebm ? 'webm' : 'm4a';
  const cleanMimeType = isWebm ? 'audio/webm' : 'audio/mp4';

  return {
    blob,
    fileName: `youtube_${videoId}.${ext}`,
    mimeType: cleanMimeType,
  };
}

export async function fetchYouTubeAudioBlob(
  videoId: string,
  options?: { signal?: AbortSignal; maxBytes?: number },
): Promise<{ blob: Blob; fileName: string; mimeType: string }> {
  // SmartTube multi-client profiles for robust InnerTube stream resolution (avoiding HTTP 403)
  const clientProfiles = [
    {
      context: {
        client: {
          clientName: 'ANDROID_VR',
          clientVersion: '1.61.48',
          deviceModel: 'Quest 3',
          osVersion: '12',
          hl: 'zh-TW',
          gl: 'TW',
        },
      },
      headers: {
        'X-YouTube-Client-Name': '56',
        'X-YouTube-Client-Version': '1.61.48',
        'User-Agent': 'Mozilla/5.0 (Android 12; Mobile VR; rv:128.0) Gecko/128.0 Firefox/128.0',
      },
    },
    {
      context: {
        client: {
          clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
          clientVersion: '2.0',
          clientScreen: 'EMBED',
          hl: 'zh-TW',
          gl: 'TW',
        },
        thirdParty: {
          embedUrl: 'https://www.youtube.com',
        },
      },
      headers: {
        'X-YouTube-Client-Name': '85',
        'X-YouTube-Client-Version': '2.0',
        'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/76.0.3809.146 TV Safari/537.36',
      },
    },
    {
      context: {
        client: {
          clientName: 'IOS',
          clientVersion: '19.45.4',
          deviceModel: 'iPhone16,2',
          osVersion: '17.5.1',
          hl: 'zh-TW',
          gl: 'TW',
        },
      },
      headers: {
        'X-YouTube-Client-Name': '5',
        'X-YouTube-Client-Version': '19.45.4',
        'User-Agent': 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; zh_TW)',
      },
    },
    {
      context: {
        client: {
          clientName: 'WEB_EMBEDDED_PLAYER',
          clientVersion: '1.20240901.01.00',
          hl: 'zh-TW',
          gl: 'TW',
        },
        thirdParty: {
          embedUrl: 'https://www.youtube.com',
        },
      },
      headers: {
        'X-YouTube-Client-Name': '56',
        'X-YouTube-Client-Version': '1.20240901.01.00',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    },
  ];

  let lastError: string | null = null;

  for (const profile of clientProfiles) {
    try {
      const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://www.youtube.com',
          'Referer': 'https://www.youtube.com/',
          ...profile.headers,
        },
        body: JSON.stringify({
          videoId,
          ...profile.context,
        }),
        signal: options?.signal,
      });

      if (!response.ok) {
        lastError = `YouTube Player API 回應 HTTP ${response.status}`;
        continue;
      }

      const data = (await response.json()) as YouTubePlayerResponse;
      if (data.playabilityStatus?.status && data.playabilityStatus.status !== 'OK') {
        lastError = data.playabilityStatus.reason ?? data.playabilityStatus.status;
        continue;
      }

      const allFormats = [
        ...(data.streamingData?.adaptiveFormats ?? []),
        ...(data.streamingData?.formats ?? []),
      ];

      const optimal = selectOptimalAudioFormat(allFormats);
      if (!optimal || !optimal.url) {
        lastError = '找不到直接可下載的音訊串流軌';
        continue;
      }

      return await downloadAudioFormatBlob(optimal, videoId, options);
    } catch (err) {
      if (options?.signal?.aborted) {
        throw new Error('已取消音訊擷取');
      }
      lastError = err instanceof Error ? err.message : '連線 YouTube 失敗';
    }
  }

  throw new Error(lastError ?? '無法直接擷取 YouTube 音訊串流，請確認網路連線');
}
