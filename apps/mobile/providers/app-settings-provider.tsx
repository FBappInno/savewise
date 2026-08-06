import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { translations } from "@/i18n/translations";
import {
  loadAppSettings,
  saveAppSettings,
} from "@/services/settings-storage";
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type SupportedLanguage,
} from "@/types/app-settings";

type SettingsContextValue = {
  settings: AppSettings;
  locale: SupportedLanguage;
  isReady: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  updateSettings: (update: (current: AppSettings) => AppSettings) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);
  const settingsRef = useRef(DEFAULT_APP_SETTINGS);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    void loadAppSettings().then((stored) => {
      const normalizedSettings =
        normalizeAppSettings(
          stored,
        );

      setSettings(
        normalizedSettings,
      );

      settingsRef.current =
        normalizedSettings;

      setReady(true);

      if (!stored.workspace) {
        void saveAppSettings(
          normalizedSettings,
        );
      }
    });
  }, []);

  const locale = resolveLocale(settings.language.display);
  const i18n = useMemo(() => {
    const instance = new I18n(translations);
    instance.locale = locale;
    instance.enableFallback = true;
    instance.defaultLocale = "en";
    return instance;
  }, [locale]);

  const updateSettings = useCallback(async (
    update: (current: AppSettings) => AppSettings,
  ) => {
    const nextSettings = update(settingsRef.current);
    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    await saveAppSettings(nextSettings);
  }, []);

  return (
    <SettingsContext.Provider value={{
      settings,
      locale,
      isReady,
      t: (key, options) => i18n.t(key, options),
      updateSettings,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useAppSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useAppSettings must be used inside AppSettingsProvider.");
  return context;
}

function resolveLocale(display: AppSettings["language"]["display"]): SupportedLanguage {
  if (display !== "system") return display;
  const language = getLocales()[0]?.languageCode;
  return language === "de" ||
    language === "fr" ||
    language === "it" ||
    language === "es"
    ? language
    : "en";
}


function normalizeAppSettings(
  stored:
    Partial<AppSettings> | null |
    undefined,
): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    ...stored,

    account: {
      ...DEFAULT_APP_SETTINGS.account,
      ...(stored?.account ?? {}),
    },

    workspace: {
      ...DEFAULT_APP_SETTINGS.workspace,
      ...(stored?.workspace ?? {}),
    },

    language: {
      ...DEFAULT_APP_SETTINGS.language,
      ...(stored?.language ?? {}),
    },

    dateTime: {
      ...DEFAULT_APP_SETTINGS.dateTime,
      ...(stored?.dateTime ?? {}),
    },

    storage: {
      ...DEFAULT_APP_SETTINGS.storage,
      ...(stored?.storage ?? {}),
    },

    privacy: {
      ...DEFAULT_APP_SETTINGS.privacy,
      ...(stored?.privacy ?? {}),
    },

    ai: {
      ...DEFAULT_APP_SETTINGS.ai,
      ...(stored?.ai ?? {}),
    },
  };
}
