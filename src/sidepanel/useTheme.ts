import { useCallback, useEffect, useState } from 'react';
import { isExtensionRuntime } from './client';
import type { AppTheme } from './components/HeaderStatus';

const THEME_KEY = 'appTheme';

function getSystemTheme(): AppTheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(getSystemTheme);

  useEffect(() => {
    const loadTheme = async () => {
      if (isExtensionRuntime()) {
        try {
          if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
            const stored = await chrome.storage.local.get(THEME_KEY);
            const savedTheme = stored?.[THEME_KEY];
            if (savedTheme === 'light' || savedTheme === 'dark') {
              setThemeState(savedTheme);
            }
          }
        } catch {}
        return;
      }

      try {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeState(savedTheme);
        }
      } catch {}
    };

    void loadTheme();
  }, []);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    if (isExtensionRuntime()) {
      try {
        if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
          void chrome.storage.local.set({ [THEME_KEY]: nextTheme });
        }
      } catch {}
    } else {
      try {
        localStorage.setItem(THEME_KEY, nextTheme);
      } catch {}
    }
  }, []);

  return { theme, setTheme };
}
