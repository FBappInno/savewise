export type WebDisplayLanguage =
  | "system"
  | "de"
  | "en"
  | "fr"
  | "it"
  | "es";

export type WebInputLanguage =
  | "auto"
  | "de"
  | "en"
  | "fr"
  | "it"
  | "es";

export type WebDateFormat =
  | "day-month-year"
  | "month-day-year"
  | "year-month-day";

export type WebTimeFormat =
  | "system"
  | "12-hour"
  | "24-hour";

export type WebSettings = {
  language: {
    display:
      WebDisplayLanguage;

    input:
      WebInputLanguage;
  };

  dateTime: {
    dateFormat:
      WebDateFormat;

    timeFormat:
      WebTimeFormat;
  };

  privacy: {
    usageAnalytics:
      boolean;

    externalContentProcessing:
      boolean;
  };

  ai: {
    contentAnalysis:
      boolean;

    knowledgeGraph:
      boolean;

    autonomousResearch:
      boolean;
  };
};

export const DEFAULT_WEB_SETTINGS:
WebSettings = {
  language: {
    display:
      "system",

    input:
      "auto",
  },

  dateTime: {
    dateFormat:
      "day-month-year",

    timeFormat:
      "system",
  },

  privacy: {
    usageAnalytics:
      false,

    externalContentProcessing:
      true,
  },

  ai: {
    contentAnalysis:
      true,

    knowledgeGraph:
      true,

    autonomousResearch:
      true,
  },
};

const STORAGE_KEY =
  "savewise.web.settings.v1";

export const WEB_SETTINGS_EVENT =
  "savewise:web-settings-changed";

export function loadWebSettings():
WebSettings {
  if (
    typeof window ===
    "undefined"
  ) {
    return DEFAULT_WEB_SETTINGS;
  }

  try {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (!stored) {
      return DEFAULT_WEB_SETTINGS;
    }

    const parsed =
      JSON.parse(
        stored,
      ) as
      Partial<WebSettings>;

    return {
      language: {
        ...DEFAULT_WEB_SETTINGS
          .language,

        ...parsed.language,
      },

      dateTime: {
        ...DEFAULT_WEB_SETTINGS
          .dateTime,

        ...parsed.dateTime,
      },

      privacy: {
        ...DEFAULT_WEB_SETTINGS
          .privacy,

        ...parsed.privacy,
      },

      ai: {
        ...DEFAULT_WEB_SETTINGS
          .ai,

        ...parsed.ai,
      },
    };
  } catch {
    return DEFAULT_WEB_SETTINGS;
  }
}

export function saveWebSettings(
  settings:
    WebSettings,
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      settings,
    ),
  );

  window.dispatchEvent(
    new CustomEvent(
      WEB_SETTINGS_EVENT,
      {
        detail:
          settings,
      },
    ),
  );
}

export function resolvePreferredLanguage(
  settings:
    WebSettings,
):
  | "de"
  | "en"
  | "fr"
  | "it"
  | "es" {
  if (
    settings.language.input !==
    "auto"
  ) {
    return settings.language.input;
  }

  if (
    settings.language.display !==
    "system"
  ) {
    return settings.language.display;
  }

  return "de";
}
