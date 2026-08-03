import type {
  DiscoveryCategory,
  DiscoverySource,
} from "@/types/discovery";

export type ImportResponse = {
  metadata: {
    url: string;
    title: string;

    description?: string;
    author?: string;
    thumbnailUrl?: string;
    siteName?: string;
    publishedAt?: string;
  };

  analysis: {
    improvedTitle: string;

    summary: string;

    classification: {
      primaryCategory:
        DiscoveryCategory;

      secondaryCategory: string;

      topic: string;

      subtopics: string[];
    };

    keywords: string[];

    language: string;

    confidence: number;
  };

  organization: {
    primaryCategory:
      DiscoveryCategory;

    secondaryCategory: string;

    topic: string;

    subtopics: string[];
  };
};

function getApiUrl(): string {
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL ist nicht konfiguriert.",
    );
  }

  return apiUrl.replace(/\/$/, "");
}

export async function importContent(
  url: string,
): Promise<ImportResponse> {
  const controller =
    new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 90_000);

  try {
    const response = await fetch(
      `${getApiUrl()}/api/import`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          url,
        }),

        signal: controller.signal,
      },
    );

    let body: unknown;

    try {
      body = await response.json();
    } catch {
      throw new Error(
        "Das Backend hat keine gültige JSON-Antwort geliefert.",
      );
    }

    if (!response.ok) {
      const errorMessage =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
          ? body.error
          : "Der Import ist fehlgeschlagen.";

      throw new Error(errorMessage);
    }

    return body as ImportResponse;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "Die Analyse hat länger als 90 Sekunden gedauert.",
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function detectDiscoverySource(
  url: string,
): DiscoverySource {
  try {
    const hostname = new URL(url)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");

    if (
      hostname === "youtube.com" ||
      hostname.endsWith(
        ".youtube.com",
      ) ||
      hostname === "youtu.be"
    ) {
      return "youtube";
    }

    if (
      hostname === "instagram.com" ||
      hostname.endsWith(
        ".instagram.com",
      )
    ) {
      return "instagram";
    }

    if (
      hostname === "tiktok.com" ||
      hostname.endsWith(
        ".tiktok.com",
      )
    ) {
      return "tiktok";
    }

    return "web";
  } catch {
    return "web";
  }
}