import type { ReactNode } from 'react';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { DEFAULT_THEME_KEY, getThemeByKey } from './presets';
import type { AppTheme, ThemeKey } from './types';
import { getSelectedThemeKey, setSelectedThemeKey } from '@/storage/settingsRepository';

type ThemeContextValue = {
  theme: AppTheme;
  selectedThemeKey: ThemeKey;
  setThemeKey: (themeKey: ThemeKey) => Promise<void>;
  isThemeLoaded: boolean;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [selectedThemeKey, setSelectedThemeKeyState] = useState<ThemeKey>(DEFAULT_THEME_KEY);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getSelectedThemeKey()
      .then((themeKey) => {
        if (isMounted) {
          setSelectedThemeKeyState(themeKey);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsThemeLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeKey = useCallback(
    async (themeKey: ThemeKey) => {
      const previousThemeKey = selectedThemeKey;
      setSelectedThemeKeyState(themeKey);

      try {
        await setSelectedThemeKey(themeKey);
      } catch (error) {
        setSelectedThemeKeyState(previousThemeKey);
        throw error;
      }
    },
    [selectedThemeKey],
  );

  const value = useMemo(
    () => ({
      theme: getThemeByKey(selectedThemeKey),
      selectedThemeKey,
      setThemeKey,
      isThemeLoaded,
    }),
    [isThemeLoaded, selectedThemeKey, setThemeKey],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
