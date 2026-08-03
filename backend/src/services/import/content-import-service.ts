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
    contentType: "html" | "pdf";
    fetchStrategy: "standard" | "browser-compatible";
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
): Promise<ContentImportResult> {
  console.log("[Import] Starting:", url);

  const metadataStartedAt = Date.now();
  const metadata = await fetchPageMetadata(url);
  console.log(`[Import] Metadata: ${Date.now() - metadataStartedAt}ms`);

  console.log(
    "[Import] Metadata loaded:",
    metadata.title,
  );

  const aiStartedAt = Date.now();
  const analysis = await analyzeContent(metadata);
  console.log(`[Import] AI: ${Date.now() - aiStartedAt}ms`);

  console.log(
    "[Import] AI analysis completed:",
    analysis.classification.topic,
  );

  const now = new Date().toISOString();

  const topics = createTopics(
    analysis.classification.topic,
    analysis.classification.subtopics,
  );

  const discovery: Discovery = {
    id: randomUUID(),

    source: detectDiscoverySource(metadata.url),

    url: metadata.url,

    title:
      metadata.title.trim() ||
      analysis.improvedTitle.trim() ||
      metadata.url,

    improvedTitle:
      analysis.improvedTitle.trim() ||
      metadata.title.trim() ||
      metadata.url,

    description: normalizeOptionalText(
      metadata.description,
    ),

    summary: analysis.summary.trim(),

    thumbnailUrl: normalizeOptionalText(
      metadata.thumbnailUrl,
    ),

    author: normalizeOptionalText(
      metadata.author,
    ),

    publishedAt: normalizeOptionalText(
      metadata.publishedAt,
    ),

    classification: {
      primaryCategory:
        analysis.classification.primaryCategory,

      secondaryCategory:
        analysis.classification.secondaryCategory.trim(),

      topic:
        analysis.classification.topic.trim(),

      subtopics: normalizeStringArray(
        analysis.classification.subtopics,
      ),
    },

    keywords: normalizeStringArray(
      analysis.keywords,
    ),

    language: analysis.language.trim(),

    confidence: normalizeConfidence(
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

      description: normalizeOptionalText(
        metadata.description,
      ),

      author: normalizeOptionalText(
        metadata.author,
      ),

      thumbnailUrl: normalizeOptionalText(
        metadata.thumbnailUrl,
      ),

      siteName: normalizeOptionalText(
        metadata.siteName,
      ),

      publishedAt: normalizeOptionalText(
        metadata.publishedAt,
      ),

      contentType: metadata.contentType,

      fetchStrategy: metadata.fetchStrategy,
    },

    analysis,

    organization: {
      primaryCategory:
        analysis.classification.primaryCategory,

      secondaryCategory:
        analysis.classification.secondaryCategory,

      topic:
        analysis.classification.topic,

      subtopics:
        analysis.classification.subtopics,
    },

    discovery,
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
      hostname.endsWith(".youtube.com") ||
      hostname === "youtu.be"
    ) {
      return "youtube";
    }

    if (
      hostname === "instagram.com" ||
      hostname.endsWith(".instagram.com")
    ) {
      return "instagram";
    }

    if (
      hostname === "tiktok.com" ||
      hostname.endsWith(".tiktok.com")
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
  const normalizedValues = values
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(normalizedValues)];
}

function normalizeOptionalText(
  value: string | undefined,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim();

  return normalizedValue || undefined;
}

function normalizeConfidence(
  confidence: number,
): number {
  if (!Number.isFinite(confidence)) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(0, confidence),
  );
}
