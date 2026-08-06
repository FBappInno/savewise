import { randomUUID } from "node:crypto";

import type {
  Discovery,
  DiscoverySource,
} from "@savewise/shared";

import { fetchPageMetadata } from "../../utils/metadata-fetcher";
import { analyzeContent } from "../ai/openai-content-analyzer";

export type ContentImportResult = {
  metadata: {
    url: string;
    title: string;
    description?: string;
    author?: string;
    thumbnailUrl?: string;
    siteName?: string;
    publishedAt?: string;
    contentType:
      | "html"
      | "pdf";
    fetchStrategy:
      | "standard"
      | "browser-compatible"
      | "url-derived";
  };

  analysis: {
    improvedTitle: string;
    summary: string;

    classification: {
      primaryCategory:
        Discovery["classification"] extends infer T
          ? T extends {
              primaryCategory: infer C;
            }
            ? C
            : never
          : never;

      secondaryCategory: string;
      topic: string;
      subtopics: string[];
    };

    keywords: string[];
    language: string;
    confidence: number;
  };

  organization: {
    primaryCategory: string;
    secondaryCategory: string;
    topic: string;
    subtopics: string[];
  };

  discovery: Discovery;
};

export async function importContent(
  url: string,
  options: {
    preferredLanguage?:
      | "de"
      | "en"
      | "fr"
      | "it"
      | "es";

    preferredKnowledgePath?:
      string[];
  } = {},
): Promise<ContentImportResult> {
  console.log(
    "[Import] Starting:",
    url,
  );

  const metadataStartedAt =
    Date.now();

  const metadata =
    await fetchPageMetadata(url);

  console.log(
    `[Import] Metadata: ${
      Date.now() -
      metadataStartedAt
    }ms`,
  );

  console.log(
    "[Import] Metadata loaded:",
    metadata.title,
  );

  const aiStartedAt =
    Date.now();

  const analysis =
    await analyzeContent(
      metadata,
      options.preferredLanguage,
    );

  console.log(
    `[Import] AI: ${
      Date.now() - aiStartedAt
    }ms`,
  );

  console.log(
    "[Import] AI analysis completed:",
    analysis.classification.topic,
  );

  const now =
    new Date().toISOString();

  const preferredPath =
    normalizeStringArray(
      options.preferredKnowledgePath ??
        [],
    ).slice(0, 3);

  const classification =
    applyPreferredKnowledgePath(
      analysis.classification,
      preferredPath,
    );

  const topics = createTopics(
    classification.topic,
    classification.subtopics,
  );

  const discovery: Discovery = {
    id: randomUUID(),

    source:
      detectDiscoverySource(
        metadata.url,
      ),

    url: metadata.url,

    title:
      metadata.title.trim() ||
      analysis.improvedTitle.trim() ||
      metadata.url,

    improvedTitle:
      analysis.improvedTitle.trim() ||
      metadata.title.trim() ||
      metadata.url,

    description:
      normalizeOptionalText(
        metadata.description,
      ),

    summary: compactSummary(
      analysis.summary,
    ),

    thumbnailUrl:
      normalizeOptionalText(
        metadata.thumbnailUrl,
      ),

    author:
      normalizeOptionalText(
        metadata.author,
      ),

    publishedAt:
      normalizeOptionalText(
        metadata.publishedAt,
      ),

    classification: {
      primaryCategory:
        classification.primaryCategory,

      secondaryCategory:
        classification.secondaryCategory.trim(),

      topic:
        classification.topic.trim(),

      subtopics:
        normalizeStringArray(
          classification.subtopics,
        ),
    },

    keywords:
      normalizeStringArray(
        analysis.keywords,
      ),

    language:
      analysis.language.trim(),

    confidence:
      normalizeConfidence(
        analysis.confidence,
      ),

    topics,

    createdAt: now,
    updatedAt: now,
    savedAtLabel: "Just now",
  };

  return {
    metadata: {
      url,
      title: metadata.title,

      description:
        normalizeOptionalText(
          metadata.description,
        ),

      author:
        normalizeOptionalText(
          metadata.author,
        ),

      thumbnailUrl:
        normalizeOptionalText(
          metadata.thumbnailUrl,
        ),

      siteName:
        normalizeOptionalText(
          metadata.siteName,
        ),

      publishedAt:
        normalizeOptionalText(
          metadata.publishedAt,
        ),

      contentType:
        metadata.contentType,

      fetchStrategy:
        metadata.fetchStrategy,
    },

    analysis,

    organization: {
      primaryCategory:
        classification.primaryCategory,

      secondaryCategory:
        classification.secondaryCategory,

      topic:
        classification.topic,

      subtopics:
        classification.subtopics,
    },

    discovery,
  };
}

function applyPreferredKnowledgePath(
  classification:
    ContentImportResult["analysis"]["classification"],
  path: string[],
): ContentImportResult["analysis"]["classification"] {
  if (path.length === 0) {
    return classification;
  }

  if (path.length === 1) {
    return {
      ...classification,

      // Der manuell gewählte Wert ist nur die Hauptebene.
      secondaryCategory: path[0],

      // Topic und Unterthemen bleiben aus der KI-Analyse erhalten.
      topic:
        classification.topic.trim() ||
        path[0],

      subtopics:
        normalizeStringArray(
          classification.subtopics,
        ),
    };
  }

  return {
    ...classification,
    secondaryCategory: path[0],
    topic:
      path[1] ||
      classification.topic,
    subtopics:
      path.length > 2
        ? path.slice(2)
        : classification.subtopics,
  };
}

function detectDiscoverySource(
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
      hostname ===
        "instagram.com" ||
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

function createTopics(
  mainTopic: string,
  subtopics: string[],
): string[] {
  return normalizeStringArray([
    mainTopic,
    ...subtopics,
  ]);
}

function normalizeStringArray(
  values: string[],
): string[] {
  const unique =
    new Map<string, string>();

  values.forEach((value) => {
    const normalizedValue =
      value
        .replace(/\s+/g, " ")
        .trim();

    if (!normalizedValue) {
      return;
    }

    const key =
      normalizedValue.toLocaleLowerCase();

    if (!unique.has(key)) {
      unique.set(
        key,
        normalizedValue,
      );
    }
  });

  return [...unique.values()];
}

function normalizeOptionalText(
  value: string | undefined,
): string | undefined {
  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalizedValue =
    value.trim();

  return (
    normalizedValue || undefined
  );
}

function normalizeConfidence(
  confidence: number,
): number {
  if (
    !Number.isFinite(confidence)
  ) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(0, confidence),
  );
}

function compactSummary(
  value: string,
): string {
  const normalized = value
    .replace(/\s+/g, " ")
    .trim();

  const sentences =
    normalized.match(
      /[^.!?]+[.!?]+|[^.!?]+$/g,
    ) ?? [];

  const twoSentences =
    sentences
      .slice(0, 2)
      .join(" ")
      .trim();

  if (
    twoSentences.length <= 420
  ) {
    return twoSentences;
  }

  const shortened =
    twoSentences.slice(0, 417);

  const lastSpace =
    shortened.lastIndexOf(" ");

  return `${shortened
    .slice(
      0,
      Math.max(lastSpace, 0),
    )
    .trim()}…`;
}