import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod/v3";

import type {
  ContentAnalysis,
  ContentCategory,
} from "../../types/content-analysis";

import type { PageMetadata } from "../../types/page-metadata";

const CONTENT_ANALYSIS_MODEL =
  "gpt-4.1-mini";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 45_000,
  maxRetries: 1,
});

const MAX_ANALYSIS_TEXT_CHARS =
  8_000;

const MIN_TEXT_FOR_TEXT_ONLY_VIDEO =
  500;

const categories = [
  "technology",
  "finance",
  "business",
  "science",
  "health",
  "education",
  "productivity",
  "culture",
  "news",
  "lifestyle",
  "other",
] as const satisfies readonly ContentCategory[];

const ContentAnalysisSchema = z.object({
  improvedTitle: z
    .string()
    .min(3)
    .max(120),

  summary: z
    .string()
    .min(20)
    .max(420),

  classification: z.object({
    primaryCategory: z.enum(categories),

    secondaryCategory: z
      .string()
      .min(2)
      .max(60),

    topic: z
      .string()
      .min(2)
      .max(60),

    subtopics: z
      .array(
        z.string().min(2).max(50),
      )
      .max(6),
  }),

  keywords: z
    .array(
      z.string().min(2).max(40),
    )
    .min(2)
    .max(12),

  language: z
    .string()
    .min(2)
    .max(10),

  confidence: z
    .number()
    .min(0)
    .max(1),
});

export async function analyzeContent(
  metadata: PageMetadata,
  preferredLanguage?: "de" | "en" | "fr" | "it" | "es",
): Promise<ContentAnalysis> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured.",
    );
  }

  const extractedText =
    metadata.extractedText
      ?.slice(
        0,
        MAX_ANALYSIS_TEXT_CHARS,
      )
      .trim() ||
    "";

  const videoTranscript =
    metadata.videoTranscript
      ?.slice(
        0,
        MAX_ANALYSIS_TEXT_CHARS,
      )
      .trim() ||
    "";

  /*
   * Das Modell benötigt keine null-lastige
   * Kopie aller Metadaten.
   *
   * Wir übergeben nur Informationen, die
   * für Titel, Zusammenfassung und
   * Klassifikation relevant sind.
   */
  const metadataInput =
    JSON.stringify({
      preferredLanguage:
        preferredLanguage ??
        undefined,

      title:
        metadata.title,

      description:
        metadata.description ??
        undefined,

      author:
        metadata.author ??
        undefined,

      site:
        metadata.siteName ??
        undefined,

      contentType:
        metadata.contentType,

      fetchStrategy:
        metadata.fetchStrategy,

      mediaType:
        metadata.mediaType ??
        undefined,

      videoPlatform:
        metadata.videoPlatform ??
        undefined,

      transcript:
        videoTranscript ||
        undefined,

      text:
        extractedText ||
        undefined,
    });

  const availableTextCharacters =
    extractedText.length +
    videoTranscript.length;

  /*
   * Ein Thumbnail verursacht einen
   * multimodalen Modellpfad.
   *
   * Wenn bereits genügend Text oder
   * Transcript vorhanden ist, liefert
   * das Bild für die Klassifikation meist
   * wenig zusätzlichen Nutzen.
   *
   * Bei schwacher Textbasis bleibt das
   * Thumbnail dagegen erhalten.
   */
  const shouldUseThumbnail =
    metadata.mediaType ===
      "video" &&
    Boolean(
      metadata.thumbnailUrl,
    ) &&
    availableTextCharacters <
      MIN_TEXT_FOR_TEXT_ONLY_VIDEO;

  const input =
    shouldUseThumbnail &&
    metadata.thumbnailUrl
      ? [
          {
            role:
              "user" as const,

            content: [
              {
                type:
                  "input_text" as const,

                text:
                  metadataInput,
              },

              {
                type:
                  "input_image" as const,

                image_url:
                  metadata.thumbnailUrl,

                detail:
                  "low" as const,
              },
            ],
          },
        ]
      : metadataInput;

  const aiStartedAt =
    Date.now();

  const response = await openai.responses.parse({
    model:
      CONTENT_ANALYSIS_MODEL,

    instructions: [
      "You are the classification engine for SaveWise, a personal knowledge library.",
      "Analyze the supplied content and return only evidence-supported information.",

      "Return a factual improved title, a compact summary of at most 2 sentences, classification, keywords, language and confidence.",

      "SaveWise uses this hierarchy:",
      "secondaryCategory = the GALAXY: a broad reusable subject area.",
      "topic = the PLANET: the main subject of this specific content inside that Galaxy.",
      "subtopics = STARS: specific narrower concepts contained in the content.",

      "IMPORTANT: Galaxy, Planet, Star, Stars, Topic, Category, General, Miscellaneous and Other are hierarchy or placeholder terms, NOT valid semantic labels. Never return those words as secondaryCategory, topic or subtopics.",

      "Use concrete semantic names based on the actual subject.",
      "Example: Galaxy 'Travel', Planet 'Urban Exploration', Stars ['Abandoned Places', 'Military Sites'].",
      "Example: Galaxy 'Sport', Planet 'Alpine Skiing', Stars ['Ski Technique', 'Equipment'].",

      "Galaxy must be broader than Planet. Planet must be broader than each Star.",
      "Prefer stable reusable labels instead of inventing unnecessarily narrow Galaxies.",
      "Do not use websites, platforms, authors or media formats as Galaxy/Planet labels unless they are genuinely the subject.",

      "primaryCategory is internal only and must use one of the schema enum values.",

      "Use transcript and extracted text as primary evidence.",
      "If a thumbnail image is supplied, use it only as supporting evidence and never let decorative thumbnail text override stronger textual evidence.",

      "If fetchStrategy is url-derived, infer only what the title and URL clearly support and confidence must be <= 0.65.",

      "Confidence is between 0 and 1 and reflects both evidence quality and certainty of the semantic classification.",

      preferredLanguage
        ? `Write improvedTitle, summary, secondaryCategory, topic, subtopics and keywords in ${languageName(preferredLanguage)}. Set language to '${preferredLanguage}'.`
        : "Use the dominant language of the supplied content.",
    ].join("\n"),

    input,

    text: {
      format: zodTextFormat(
        ContentAnalysisSchema,
        "savewise_content_analysis",
      ),
    },
  });

  const aiDurationMs =
    Date.now() -
    aiStartedAt;

  const inputTokens =
    response.usage
      ?.input_tokens ??
    0;

  const outputTokens =
    response.usage
      ?.output_tokens ??
    0;

  const totalTokens =
    response.usage
      ?.total_tokens ??
    inputTokens +
      outputTokens;

  const extractedTextLength =
    metadata.extractedText
      ?.length ??
    0;

  const videoTranscriptLength =
    metadata.videoTranscript
      ?.length ??
    0;

  console.log(
    "[AI Metrics]",
    JSON.stringify({
      operation:
        "content-analysis",

      model:
        CONTENT_ANALYSIS_MODEL,

      durationMs:
        aiDurationMs,

      inputTokens,
      outputTokens,
      totalTokens,

      inputCharacters:
        extractedText.length +
        videoTranscript.length,

      contentType:
        metadata.contentType,

      fetchStrategy:
        metadata.fetchStrategy,

      mediaType:
        metadata.mediaType ??
        null,

      hasThumbnail:
        Boolean(
          metadata.thumbnailUrl,
        ),

      thumbnailSentToAI:
        shouldUseThumbnail,

      hasTranscript:
        Boolean(
          metadata.videoTranscript,
        ),

      hasExtractedText:
        Boolean(
          metadata.extractedText,
        ),

      preferredLanguage:
        preferredLanguage ??
        null,
    }),
  );

  if (!response.output_parsed) {
    throw new Error(
      "AI returned no structured analysis.",
    );
  }

  const result = {
    ...response.output_parsed,

    language:
      preferredLanguage ??
      response.output_parsed
        .language,
  };

  console.log(
    "[AI Result]",
    JSON.stringify({
      model:
        CONTENT_ANALYSIS_MODEL,

      confidence:
        result.confidence,

      galaxy:
        result.classification
          .secondaryCategory,

      planet:
        result.classification
          .topic,

      stars:
        result.classification
          .subtopics.length,

      keywords:
        result.keywords.length,

      language:
        result.language,
    }),
  );

  return result;
}

function languageName(language: "de" | "en" | "fr" | "it" | "es"): string {
  return {
    de: "German",
    en: "English",
    fr: "French",
    it: "Italian",
    es: "Spanish",
  }[language];
}
