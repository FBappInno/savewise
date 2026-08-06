import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
} from "@/types/app-settings";

const SETTINGS_KEY = "savewise.app-settings.v1";
const PASSWORD_KEY = "savewise.account.password";

export async function loadAppSettings(): Promise<AppSettings> {
  const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
  await SecureStore.deleteItemAsync(PASSWORD_KEY).catch(() => undefined);

  if (!storedSettings) {
    return {
      ...DEFAULT_APP_SETTINGS,
      account: {
        ...DEFAULT_APP_SETTINGS.account,
        hasPassword: false,
      },
    };
  }

  try {
    const parsed = JSON.parse(storedSettings) as Partial<AppSettings>;
    return mergeSettings(parsed, false);
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

function mergeSettings(
  settings: Partial<AppSettings>,
  hasPassword: boolean,
): AppSettings {
  const legacyStorage = settings.storage as
    | (Partial<AppSettings["storage"]> & { location?: "local" | "cloud" })
    | undefined;

  return {
    account: {
      ...DEFAULT_APP_SETTINGS.account,
      ...settings.account,
      hasPassword,
    },
    workspace: {
      ...DEFAULT_APP_SETTINGS.workspace,
      ...settings.workspace,
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
      activeMode:
        legacyStorage?.connectionStatus === "connected" &&
        legacyStorage.activeMode === "bring-your-own-cloud"
          ? "bring-your-own-cloud"
          : "local",
      preferredMode:
        legacyStorage?.preferredMode ??
        (legacyStorage?.location === "cloud" ? "savewise-cloud" : "local"),
      provider: legacyStorage?.provider ?? null,
      syncEnabled: legacyStorage?.syncEnabled ?? false,
      connectionStatus: legacyStorage?.connectionStatus ?? "local-only",
      lastSyncAt: legacyStorage?.lastSyncAt ?? null,
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
