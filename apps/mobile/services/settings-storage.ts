import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
} from "@/types/app-settings";

const SETTINGS_KEY = "savewise.app-settings.v1";
const PASSWORD_KEY = "savewise.account.password";

export async function loadAppSettings(): Promise<AppSettings> {
  const [storedSettings, storedPassword] = await Promise.all([
    AsyncStorage.getItem(SETTINGS_KEY),
    SecureStore.getItemAsync(PASSWORD_KEY),
  ]);

  if (!storedSettings) {
    return {
      ...DEFAULT_APP_SETTINGS,
      account: {
        ...DEFAULT_APP_SETTINGS.account,
        hasPassword: Boolean(storedPassword),
      },
    };
  }

  try {
    const parsed = JSON.parse(storedSettings) as Partial<AppSettings>;
    return mergeSettings(parsed, Boolean(storedPassword));
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export async function saveAppSettings(
  settings: AppSettings,
): Promise<void> {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...settings,
      account: {
        ...settings.account,
        hasPassword: undefined,
      },
    }),
  );
}

export async function saveAccountPassword(password: string): Promise<boolean> {
  const normalized = password.trim();
  if (normalized) {
    await SecureStore.setItemAsync(PASSWORD_KEY, normalized, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return true;
  }
  return SecureStore.getItemAsync(PASSWORD_KEY).then(Boolean);
}

function mergeSettings(
  settings: Partial<AppSettings>,
  hasPassword: boolean,
): AppSettings {
  return {
    account: {
      ...DEFAULT_APP_SETTINGS.account,
      ...settings.account,
      hasPassword,
    },
    language: {
      ...DEFAULT_APP_SETTINGS.language,
      ...settings.language,
    },
    dateTime: {
      ...DEFAULT_APP_SETTINGS.dateTime,
      ...settings.dateTime,
    },
    storage: {
      ...DEFAULT_APP_SETTINGS.storage,
      ...settings.storage,
    },
    privacy: {
      ...DEFAULT_APP_SETTINGS.privacy,
      ...settings.privacy,
    },
    ai: {
      ...DEFAULT_APP_SETTINGS.ai,
      ...settings.ai,
    },
  };
}
