import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod/v3";

import type {
  ContentAnalysis,
  ContentCategory,
} from "../../types/content-analysis";

import type { PageMetadata } from "../../types/page-metadata";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 45_000,
  maxRetries: 1,
});

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

  const response = await openai.responses.parse({
    model: "gpt-4.1-mini",

    instructions: [
      "You are the knowledge organization engine for SaveWise.",
      "Analyze saved online content using only the provided metadata and extracted text.",
      "Do not invent information that is not supported by the metadata.",
      "Create a clear and factual improved title.",
      "Write a compact summary with at most two short sentences and roughly 55 words.",
      "Lead with the central insight. Remove introductions, repetition, examples and secondary details unless essential.",
      "Never start with phrases such as 'This article discusses' or 'The content is about'.",
      "Build a reusable hierarchy for a personal knowledge library.",
      "The hierarchy must follow this order:",
      "primaryCategory -> secondaryCategory -> topic -> subtopics.",
      "Use broad reusable category names rather than overly specific phrases.",
      "Examples:",
      "technology -> Software Development -> React -> Performance",
      "finance -> Investing -> ETFs -> Passive Investing",
      "health -> Nutrition -> Protein -> Muscle Growth",
      "Avoid using the website or platform name as a topic.",
      "Confidence must represent how strongly the supplied metadata supports the classification.",
      preferredLanguage
        ? `Write the improved title and summary in ${languageName(preferredLanguage)}.`
        : "Preserve the dominant language of the content.",
    ].join("\n"),

    input: JSON.stringify({
      allowedPrimaryCategories: categories,
      preferredLanguage: preferredLanguage ?? null,

      metadata: {
        url: metadata.url,
        title: metadata.title,
        description:
          metadata.description ?? null,
        author:
          metadata.author ?? null,
        siteName:
          metadata.siteName ?? null,
        publishedAt:
          metadata.publishedAt ?? null,
        contentType: metadata.contentType,
        extractedText:
          metadata.extractedText?.slice(0, 12_000) ?? null,
      },
    }),

    text: {
      format: zodTextFormat(
        ContentAnalysisSchema,
        "savewise_content_analysis",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error(
      "AI returned no structured analysis.",
    );
  }

  return response.output_parsed;
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
