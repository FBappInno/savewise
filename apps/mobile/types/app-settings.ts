export type SupportedLanguage = "de" | "en" | "fr" | "it" | "es";
export type DisplayLanguage = "system" | SupportedLanguage;
export type InputLanguage = "auto" | SupportedLanguage;
import type {
  ExternalStorageProvider,
  StorageMode,
} from "@savewise/shared";
export type DateFormat = "day-month-year" | "month-day-year" | "year-month-day";
export type TimeFormat = "system" | "12-hour" | "24-hour";

export type AppSettings = {
  account: {
    username: string;
    email: string;
    hasPassword: boolean;
  };
  language: {
    display: DisplayLanguage;
    input: InputLanguage;
  };
  dateTime: {
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
  };
  storage: {
    activeMode: StorageMode;
    preferredMode: StorageMode;
    provider: ExternalStorageProvider | null;
    syncEnabled: boolean;
    connectionStatus: "local-only" | "connection-required" | "connected" | "error";
    lastSyncAt: string | null;
  };
  privacy: {
    usageAnalytics: boolean;
    externalContentProcessing: boolean;
  };
  ai: {
    contentAnalysis: boolean;
    knowledgeGraph: boolean;
    autonomousResearch: boolean;
  };
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  account: {
    username: "",
    email: "",
    hasPassword: false,
  },
  language: {
    display: "system",
    input: "auto",
  },
  dateTime: {
    dateFormat: "day-month-year",
    timeFormat: "system",
  },
  storage: {
    activeMode: "local",
    preferredMode: "local",
    provider: null,
    syncEnabled: false,
    connectionStatus: "local-only",
    lastSyncAt: null,
  },
  privacy: {
    usageAnalytics: false,
    externalContentProcessing: true,
  },
  ai: {
    contentAnalysis: true,
    knowledgeGraph: true,
    autonomousResearch: true,
  },
};
