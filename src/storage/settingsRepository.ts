import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from './storageKeys';
import { DEFAULT_THEME_KEY, isThemeKey } from '@/theme/presets';
import type { ThemeKey } from '@/theme/types';
import type { AppSettings } from '@/types';

function normalizeSettings(settings: Partial<AppSettings>): AppSettings {
  return {
    selectedThemeKey: isThemeKey(settings.selectedThemeKey)
      ? settings.selectedThemeKey
      : DEFAULT_THEME_KEY,
  };
}

export async function getSettings(): Promise<AppSettings> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.settings);

  if (!raw) {
    return { selectedThemeKey: DEFAULT_THEME_KEY };
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeSettings(typeof parsed === 'object' && parsed ? parsed : {});
  } catch {
    return { selectedThemeKey: DEFAULT_THEME_KEY };
  }
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const currentSettings = await getSettings();
  const nextSettings = normalizeSettings({
    ...currentSettings,
    ...patch,
  });

  await AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(nextSettings));
  return nextSettings;
}

export async function getSelectedThemeKey(): Promise<ThemeKey> {
  const settings = await getSettings();
  return settings.selectedThemeKey ?? DEFAULT_THEME_KEY;
}

export async function setSelectedThemeKey(themeKey: ThemeKey): Promise<AppSettings> {
  return updateSettings({ selectedThemeKey: themeKey });
}
