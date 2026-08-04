export type SupportedLanguage = "de" | "en" | "fr" | "it" | "es";
export type DisplayLanguage = "system" | SupportedLanguage;
export type InputLanguage = "auto" | SupportedLanguage;
export type StorageLocation = "local" | "cloud";
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
    location: StorageLocation;
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
    location: "local",
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
