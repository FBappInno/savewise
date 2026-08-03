export type SupportedLanguage = "de" | "en" | "fr" | "it" | "es";
export type DisplayLanguage = "system" | SupportedLanguage;
export type InputLanguage = "auto" | SupportedLanguage;
export type StorageLocation = "local" | "cloud";

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
