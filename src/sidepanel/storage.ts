import { isExtensionRuntime } from './client';

export async function readStoredValue<T>(key: string, fallback: T): Promise<T> {
  if (isExtensionRuntime()) {
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        const stored = await chrome.storage.local.get(key);
        return (stored?.[key] as T | undefined) ?? fallback;
      }
    } catch {
      return fallback;
    }
  }

  const stored = localStorage.getItem(key);
  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

export async function writeStoredValue<T>(key: string, value: T): Promise<void> {
  if (isExtensionRuntime()) {
    try {
      if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
        await chrome.storage.local.set({ [key]: value });
        return;
      }
    } catch {
      return;
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
