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

  taxonomyDecision: z.object({
    galaxy: z.object({
      action: z.enum([
        "reuse",
        "create_new",
      ]),

      existingLabel: z
        .string()
        .max(60),
    }),

    planet: z.object({
      action: z.enum([
        "reuse",
        "create_new",
      ]),

      existingLabel: z
        .string()
        .max(60),
    }),
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

const GalaxyCandidateSelectionSchema =
  z.object({
    galaxyIndexes:
      z.array(
        z.number()
          .int()
          .min(0)
          .max(49),
      )
        .max(5),
  });

export type ExistingKnowledgePath = {
  galaxy: string;
  planets: string[];
};

export async function analyzeContent(
  metadata: PageMetadata,
  preferredLanguage?: "de" | "en" | "fr" | "it" | "es",
  existingKnowledgePaths:
    ExistingKnowledgePath[] = [],
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
  /*
   * CLASSIFICATION V3
   *
   * Stufe 1:
   * Alle vorhandenen Galaxien werden nur mit
   * ihrem Namen betrachtet.
   *
   * Stufe 2:
   * Die eigentliche Inhaltsanalyse bekommt
   * anschließend nur noch maximal fünf
   * semantisch plausible Galaxien inklusive
   * ihrer Planeten.
   */
  const candidateSelectionStartedAt =
    Date.now();

  let candidateSelectionDurationMs =
    0;

  let candidateKnowledgePaths =
    existingKnowledgePaths
      .slice(0, 5);

  if (
    existingKnowledgePaths.length >
    5
  ) {
    try {
      const candidateInput =
        JSON.stringify({
          title:
            metadata.title,

          description:
            metadata.description,

          text:
            extractedText
              .slice(0, 1_800),

          transcript:
            videoTranscript
              .slice(0, 1_800),

          galaxies:
            existingKnowledgePaths
              .slice(0, 50)
              .map(
                (
                  path,
                  index,
                ) => ({
                  id:
                    index,

                  label:
                    path.galaxy,
                }),
              ),
        });

      const candidateResponse =
        await openai.responses.parse({
          model:
            CONTENT_ANALYSIS_MODEL,

          instructions: [
            "You select existing SaveWise Galaxies that are semantically plausible homes for a new piece of content.",
            "A Galaxy is a broad durable interest area, not the narrow topic of one individual article or video.",
            "Return at most 5 existing Galaxy IDs, ranked from most plausible to least plausible.",
            "Prefer broad semantic fit over exact word overlap.",
            "Treat translations, synonyms and related wording as the same semantic area.",
            "Include a Galaxy when the new content could reasonably belong inside it.",
            "Do not invent Galaxy IDs.",
            "If none are remotely plausible, return an empty list.",
          ].join(
            "\n",
          ),

          input:
            candidateInput,

          text: {
            format:
              zodTextFormat(
                GalaxyCandidateSelectionSchema,
                "savewise_galaxy_candidates",
              ),
          },
        });

      const rawIndexes =
        candidateResponse
          .output_parsed
          ?.galaxyIndexes ??
        [];

      const selectedIndexes =
        [
          ...new Set(
            rawIndexes.filter(
              (index) =>
                index >= 0 &&
                index <
                  existingKnowledgePaths
                    .length &&
                index < 50,
            ),
          ),
        ]
          .slice(0, 5);

      if (
        selectedIndexes.length >
        0
      ) {
        candidateKnowledgePaths =
          selectedIndexes
            .map(
              (index) =>
                existingKnowledgePaths[
                  index
                ],
            )
            .filter(
              (
                path,
              ): path is ExistingKnowledgePath =>
                Boolean(
                  path,
                ),
            );
      }

      candidateSelectionDurationMs =
        Date.now() -
        candidateSelectionStartedAt;
    } catch (
      candidateError
    ) {
      candidateSelectionDurationMs =
        Date.now() -
        candidateSelectionStartedAt;

      console.error(
        "[AI Galaxy Candidates] selection failed; using frequency fallback:",
        candidateError,
      );

      /*
       * Ein Fehler in der Vorauswahl darf
       * niemals den Import blockieren.
       */
      candidateKnowledgePaths =
        existingKnowledgePaths
          .slice(0, 5);
    }
  } else {
    candidateSelectionDurationMs =
      Date.now() -
      candidateSelectionStartedAt;
  }

  const knowledgeContext =
    candidateKnowledgePaths
      .slice(0, 5)
      .map(
        (path) => ({
          galaxy:
            path.galaxy,

          planets:
            path.planets
              .slice(0, 8),
        }),
      );

  console.log(
    "[AI Galaxy Candidates]",
    JSON.stringify({
      available:
        existingKnowledgePaths.length,

      selected:
        knowledgeContext.map(
          (path) =>
            path.galaxy,
        ),

      durationMs:
        candidateSelectionDurationMs,
    }),
  );

  const metadataInput =
    JSON.stringify({
      existingKnowledge:
        knowledgeContext.length > 0
          ? knowledgeContext
          : undefined,

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

      "If existingKnowledge is supplied, it contains the most semantically plausible existing Galaxies from the active SaveWise workspace.",
      "The supplied existing Galaxies were already shortlisted for semantic relevance.",
      "If ANY supplied Galaxy is a reasonable broad home for the content, you MUST reuse it.",
      "Do not create a new Galaxy merely because a more specific, elegant, translated or differently worded label could be invented.",
      "A new Galaxy is allowed only when every supplied existing Galaxy materially represents a different subject area.",

      "Before naming the Galaxy, explicitly decide taxonomyDecision.galaxy.action.",
      "Use galaxy.action='reuse' whenever an existing Galaxy covers the same broad semantic subject, even when another synonym, translation, wording or slightly narrower label might seem more precise.",
      "Creating a new Galaxy is exceptional. Use galaxy.action='create_new' only when the subject materially falls outside every existing Galaxy.",
      "If uncertain between reusing a reasonably fitting Galaxy and creating a similar new Galaxy, REUSE the existing Galaxy.",

      "When galaxy.action='reuse', set galaxy.existingLabel to the exact existing Galaxy label from existingKnowledge.",
      "When galaxy.action='create_new', set galaxy.existingLabel to an empty string.",

      "After the Galaxy decision, explicitly decide taxonomyDecision.planet.action.",
      "Use planet.action='reuse' whenever an existing Planet inside the selected Galaxy represents the same or substantially overlapping subject.",
      "Use planet.action='create_new' only when none of the existing Planets inside that Galaxy accurately represents the subject.",

      "When planet.action='reuse', set planet.existingLabel to the exact existing Planet label from existingKnowledge.",
      "When planet.action='create_new', set planet.existingLabel to an empty string.",

      "Never create a translated duplicate, synonym, spelling variant or stylistic variation of an existing Galaxy or Planet.",
      "Do not force a genuinely unrelated existing label merely to avoid creating something new.",
      "Prefer stable reusable labels instead of inventing unnecessarily narrow Galaxies.",
      "Do not use websites, platforms, authors or media formats as Galaxy/Planet labels unless they are genuinely the subject.",

      "primaryCategory is internal only and must use one of the schema enum values.",

      "Use transcript and extracted text as primary evidence.",
      "If a thumbnail image is supplied, use it only as supporting evidence and never let decorative thumbnail text override stronger textual evidence.",

      "If fetchStrategy is url-derived, infer only what the title and URL clearly support and confidence must be <= 0.65.",

      "Confidence is between 0 and 1 and reflects both evidence quality and certainty of the semantic classification.",

      preferredLanguage
        ? `Write improvedTitle, summary, NEW secondaryCategory/topic labels, subtopics and keywords in ${languageName(preferredLanguage)}. Existing Galaxy and Planet labels selected through taxonomyDecision must NEVER be translated; reuse them exactly as supplied. Set language to '${preferredLanguage}'.`
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

      availableGalaxyCandidates:
        existingKnowledgePaths.length,

      shortlistedGalaxyCandidates:
        knowledgeContext.length,

      candidateSelectionDurationMs,

      existingGalaxyCandidates:
        knowledgeContext.length,

      existingPlanetCandidates:
        knowledgeContext.reduce(
          (
            total,
            path,
          ) =>
            total +
            path.planets.length,
          0,
        ),
    }),
  );

  if (!response.output_parsed) {
    throw new Error(
      "AI returned no structured analysis.",
    );
  }

  const parsedResult =
    response.output_parsed;

  const normalizeKnowledgeLabel =
    (
      value: string,
    ) =>
      value
        .trim()
        .toLocaleLowerCase();

  const requestedGalaxy =
    parsedResult
      .taxonomyDecision
      .galaxy
      .existingLabel
      .trim();

  const matchedGalaxyPath =
    parsedResult
      .taxonomyDecision
      .galaxy
      .action ===
    "reuse"
      ? existingKnowledgePaths
          .find(
            (path) =>
              normalizeKnowledgeLabel(
                path.galaxy,
              ) ===
              normalizeKnowledgeLabel(
                requestedGalaxy,
              ),
          )
      : undefined;

  const finalGalaxy =
    matchedGalaxyPath
      ?.galaxy ??
    parsedResult
      .classification
      .secondaryCategory;

  const planetGalaxyPath =
    matchedGalaxyPath ??
    existingKnowledgePaths
      .find(
        (path) =>
          normalizeKnowledgeLabel(
            path.galaxy,
          ) ===
          normalizeKnowledgeLabel(
            finalGalaxy,
          ),
      );

  const requestedPlanet =
    parsedResult
      .taxonomyDecision
      .planet
      .existingLabel
      .trim();

  const matchedPlanet =
    parsedResult
      .taxonomyDecision
      .planet
      .action ===
    "reuse"
      ? planetGalaxyPath
          ?.planets
          .find(
            (planet) =>
              normalizeKnowledgeLabel(
                planet,
              ) ===
              normalizeKnowledgeLabel(
                requestedPlanet,
              ),
          )
      : undefined;

  const {
    taxonomyDecision,
    ...analysisResult
  } = parsedResult;

  const result = {
    ...analysisResult,

    classification: {
      ...analysisResult
        .classification,

      secondaryCategory:
        finalGalaxy,

      topic:
        matchedPlanet ??
        analysisResult
          .classification
          .topic,
    },

    language:
      preferredLanguage ??
      analysisResult.language,
  };

  console.log(
    "[AI Taxonomy Decision]",
    JSON.stringify({
      galaxyAction:
        taxonomyDecision
          .galaxy
          .action,

      requestedGalaxy:
        taxonomyDecision
          .galaxy
          .existingLabel ||
        null,

      galaxyReuseApplied:
        Boolean(
          matchedGalaxyPath,
        ),

      finalGalaxy,

      planetAction:
        taxonomyDecision
          .planet
          .action,

      requestedPlanet:
        taxonomyDecision
          .planet
          .existingLabel ||
        null,

      planetReuseApplied:
        Boolean(
          matchedPlanet,
        ),

      finalPlanet:
        matchedPlanet ??
        analysisResult
          .classification
          .topic,
    }),
  );

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
