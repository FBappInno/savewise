import { createHash } from "node:crypto";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod/v3";

import type {
  Discovery,
  KnowledgeGraph,
  ResearchCandidate,
  ResearchInterest,
} from "@savewise/shared";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  openai ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 75_000,
    maxRetries: 0,
  });
  return openai;
}

const ScoreSchema = z.number().min(0).max(1);

const InterestAnalysisSchema = z.object({
  interests: z.array(z.object({
    id: z.string().min(2).max(100),
    title: z.string().min(2).max(120),
    description: z.string().min(10).max(600),
    nodeIds: z.array(z.string()).max(30),
    discoveryCount: z.number().int().min(0),
    strength: ScoreSchema,
    knowledgeGaps: z.array(z.string().min(2).max(120)).max(10),
  })).min(3).max(10),
});

const CandidateAnalysisSchema = z.object({
  candidates: z.array(z.object({
    title: z.string().min(3).max(240),
    url: z.string().min(8).max(2000),
    sourceName: z.string().min(2).max(160),
    sourceType: z.enum([
      "study",
      "paper",
      "video",
      "podcast",
      "news",
      "github",
      "startup",
      "company",
      "product",
      "technology",
      "whitepaper",
      "documentation",
      "article",
      "other",
    ]),
    publishedAt: z.string().max(40).nullable(),
    summary: z.string().min(20).max(1200),
    interestId: z.string().min(2).max(100),
    scores: z.object({
      relevance: ScoreSchema,
      quality: ScoreSchema,
      recency: ScoreSchema,
      trustworthiness: ScoreSchema,
      knowledgeValue: ScoreSchema,
      gapCoverage: ScoreSchema,
      overall: ScoreSchema,
    }),
    relevance: z.enum([
      "relevant",
      "partially-relevant",
      "not-relevant",
    ]),
    decisionReason: z.string().min(10).max(800),
    impact: z.enum([
      "confirms",
      "contradicts",
      "extends",
      "new-perspective",
    ]),
    impactExplanation: z.string().min(10).max(800),
    relatedDiscoveryIds: z.array(z.string()).max(30),
  })).min(1).max(6),
});

export async function researchNewKnowledge(
  discoveries: Discovery[],
  graph: KnowledgeGraph,
  previousInterests: ResearchInterest[] = [],
): Promise<{
  interests: ResearchInterest[];
  candidates: ResearchCandidate[];
  discardedCount: number;
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (discoveries.length === 0) {
    return { interests: [], candidates: [], discardedCount: 0 };
  }

  let analyzedInterests = deriveGroundedInterests(previousInterests, graph);
  if (process.env.OPENAI_INTEREST_REFINEMENT_ENABLED === "true") {
    try {
      const interestResponse = await getOpenAI().responses.parse({
        model: process.env.OPENAI_RESEARCH_MODEL ?? "gpt-5.6-luna",
        max_output_tokens: 5_000,
        instructions: [
          "You are the interest and knowledge-gap analyst for SaveWise.",
          "Infer the user's current interests exclusively from the supplied knowledge graph and discoveries; never use a fixed topic list.",
          "Cover the full current library and identify 4 to 8 meaningful broad interests, including recently added domains when supported by discoveries.",
          "Detect adjacent knowledge gaps and prioritize research that closes those gaps.",
          "Every interest must be directly supported by supplied graph nodes and discovery counts.",
          "Do not introduce a domain that is absent from the supplied knowledge.",
          "Use only supplied graph node IDs.",
          "Write in the dominant language of the knowledge graph.",
        ].join("\n"),
        input: JSON.stringify({
          now: new Date().toISOString(),
          graph: compactGraph(graph),
          discoveries: compactDiscoveries(discoveries),
          previousInterests,
        }),
        text: {
          format: zodTextFormat(
            InterestAnalysisSchema,
            "savewise_research_interests",
          ),
        },
      });
      if (!interestResponse.output_parsed) {
        throw new Error("AI returned no interest analysis.");
      }
      analyzedInterests = validateInterests(
        interestResponse.output_parsed.interests,
        graph,
      );
    } catch (error) {
      console.warn("AI interest refinement failed; using grounded graph analysis:", error);
    }
  }

  const interests = enrichInterestTrends(
    analyzedInterests,
    previousInterests,
    graph.language,
  );
  if (interests.length === 0) {
    throw new Error(
      "AI interest analysis was not sufficiently grounded in the knowledge graph.",
    );
  }
  const interestBatches = chunk(interests, 3);
  const batchResults = await Promise.allSettled(
    interestBatches.map((batch, index) => researchInterestBatchWithRetry(
      batch,
      discoveries,
      graph.language,
      index,
    )),
  );
  const candidateResults = batchResults.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  if (candidateResults.length === 0) {
    const reasons = batchResults.flatMap((result) =>
      result.status === "rejected" ? [String(result.reason)] : [],
    );
    throw new Error(`All AI research batches failed: ${reasons.join("; ")}`);
  }
  const validatedCandidates = validateCandidates(
    candidateResults.flat(),
    interests,
    discoveries,
  );
  const candidates = validatedCandidates.filter(
    (candidate) => candidate.relevance !== "not-relevant",
  );
  const coveredInterestCount = new Set(
    candidates.map((candidate) => candidate.interestId),
  ).size;
  if (coveredInterestCount < interests.length) {
    console.warn(
      `AI research covered ${coveredInterestCount} of ${interests.length} interests; preserving the qualified partial result.`,
    );
  }

  return {
    interests,
    candidates,
    discardedCount: validatedCandidates.length - candidates.length,
  };
}

export function deriveGroundedInterests(
  previousInterests: ResearchInterest[],
  graph: KnowledgeGraph,
): ResearchInterest[] {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const graphDiscoveryCount = new Set(
    graph.nodes.flatMap((node) => node.discoveryIds),
  ).size;
  const now = new Date().toISOString();
  const retained = previousInterests.flatMap((interest) => {
    const nodeIds = interest.nodeIds.filter((id) => nodesById.has(id));
    if (nodeIds.length === 0) return [];
    const discoveryIds = new Set(
      nodeIds.flatMap((id) => nodesById.get(id)?.discoveryIds ?? []),
    );
    return [{
      ...interest,
      nodeIds,
      discoveryCount: discoveryIds.size,
      strength: normalizeScore(
        Math.max(0.15, Math.min(1, discoveryIds.size / Math.max(1, graphDiscoveryCount))),
      ),
    }];
  });
  const dynamic = graph.nodes
    .filter((node) => node.discoveryIds.length > 0)
    .sort((a, b) => b.discoveryIds.length - a.discoveryIds.length)
    .slice(0, 8)
    .map((node): ResearchInterest => ({
      id: normalizeKey(node.id),
      title: node.title,
      description: node.description,
      nodeIds: [node.id],
      discoveryCount: node.discoveryIds.length,
      strength: normalizeScore(node.discoveryIds.length / Math.max(1, graphDiscoveryCount)),
      previousStrength: null,
      trend: "new",
      trendExplanation: "",
      firstDetectedAt: now,
      observedRuns: 1,
      knowledgeGaps: [],
    }));
  return uniqueInterests([...retained, ...dynamic]).slice(0, 10);
}

function uniqueInterests(interests: ResearchInterest[]): ResearchInterest[] {
  return [...new Map(interests.map((interest) => [interest.id, interest])).values()];
}

async function researchInterestBatchWithRetry(
  interests: ResearchInterest[],
  discoveries: Discovery[],
  language: string,
  batchIndex: number,
): Promise<z.infer<typeof CandidateAnalysisSchema>["candidates"]> {
  try {
    return await researchInterestBatch(interests, discoveries, language, batchIndex);
  } catch (firstError) {
    await new Promise((resolve) => setTimeout(resolve, 750 * (batchIndex + 1)));
    try {
      return await researchInterestBatch(interests, discoveries, language, batchIndex);
    } catch (retryError) {
      throw new Error(
        `Research batch failed twice: ${String(firstError)}; ${String(retryError)}`,
      );
    }
  }
}

async function researchInterestBatch(
  interests: ResearchInterest[],
  discoveries: Discovery[],
  language: string,
  batchIndex: number,
): Promise<z.infer<typeof CandidateAnalysisSchema>["candidates"]> {
  const response = await getOpenAI().responses.parse({
    model: process.env.OPENAI_WEB_RESEARCH_MODEL ?? "gpt-4.1-mini",
    max_output_tokens: 5_000,
    tools: [{ type: "web_search" }],
    tool_choice: "required",
    include: ["web_search_call.action.sources"],
    instructions: [
      "You are the autonomous web research agent for SaveWise.",
      "The supplied interests are locked and grounded in the user's knowledge. Research only these interests and their listed gaps.",
      "Search the live web for recent, trustworthy and high-value primary or reputable specialist sources.",
      "Consider scientific papers, YouTube, specialist blogs, news, GitHub, podcasts, companies, startups, products, whitepapers and documentation.",
      "Return one or two evaluated candidates per supplied interest and cover every supplied interest.",
      "Classify each result as relevant, partially-relevant or not-relevant. Include rejected results in the response so the system can count and discard them.",
      "Do not suggest existing URLs. Mark candidates with an overall score below 0.55 as not-relevant.",
      "Score relevance, quality, recency, trustworthiness, new knowledge value and gap coverage independently.",
      "Prioritize gaps and information gain. Compare candidates with existing knowledge: confirms, contradicts, extends or new-perspective. Never manufacture contradictions.",
      "Use only supplied interest IDs and discovery IDs, and canonical public HTTPS URLs discovered by web search.",
      "Write descriptions in the supplied language.",
    ].join("\n"),
    input: JSON.stringify({
      now: new Date().toISOString(),
      language,
      interests,
      discoveries: compactDiscoveries(discoveries),
    }),
    text: {
      format: zodTextFormat(
        CandidateAnalysisSchema,
        `savewise_research_candidates_${batchIndex + 1}`,
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("AI returned no research candidates for an interest batch.");
  }
  return response.output_parsed.candidates;
}

function validateInterests(
  parsed: z.infer<typeof InterestAnalysisSchema>["interests"],
  graph: KnowledgeGraph,
): ResearchInterest[] {
  const validNodeIds = new Set(graph.nodes.map((node) => node.id));

  return parsed
    .map((interest) => ({
      ...interest,
      id: normalizeKey(interest.id),
      nodeIds: uniqueStrings(
        interest.nodeIds.filter((id) => validNodeIds.has(id)),
      ),
      knowledgeGaps: uniqueStrings(interest.knowledgeGaps),
      strength: normalizeScore(interest.strength),
      previousStrength: null,
      trend: "new" as const,
      trendExplanation: "",
      firstDetectedAt: new Date().toISOString(),
      observedRuns: 1,
    }))
    .filter((interest) => interest.nodeIds.length > 0);
}

function validateCandidates(
  parsed: z.infer<typeof CandidateAnalysisSchema>["candidates"],
  interests: ResearchInterest[],
  discoveries: Discovery[],
): ResearchCandidate[] {
  const validDiscoveryIds = new Set(
    discoveries.map((discovery) => discovery.id),
  );
  const existingUrls = new Set(
    discoveries.flatMap((discovery) =>
      discovery.url ? [normalizeUrl(discovery.url)] : [],
    ),
  );
  const interestIds = new Set(interests.map((interest) => interest.id));
  const candidateUrls = new Set<string>();
  const foundAt = new Date().toISOString();
  return parsed
    .filter((candidate) => {
      const normalizedUrl = normalizeUrl(candidate.url);
      const interestId = normalizeKey(candidate.interestId);
      if (
        !candidate.url.startsWith("https://") ||
        existingUrls.has(normalizedUrl) ||
        candidateUrls.has(normalizedUrl) ||
        !interestIds.has(interestId)
      ) {
        return false;
      }
      candidateUrls.add(normalizedUrl);
      return true;
    })
    .map((candidate): ResearchCandidate => ({
      ...candidate,
      id: createCandidateId(candidate.url),
      interestId: normalizeKey(candidate.interestId),
      publishedAt: candidate.publishedAt ?? undefined,
      scores: {
        relevance: normalizeScore(candidate.scores.relevance),
        quality: normalizeScore(candidate.scores.quality),
        recency: normalizeScore(candidate.scores.recency),
        trustworthiness: normalizeScore(
          candidate.scores.trustworthiness,
        ),
        knowledgeValue: normalizeScore(
          candidate.scores.knowledgeValue,
        ),
        gapCoverage: normalizeScore(candidate.scores.gapCoverage),
        overall: normalizeScore(candidate.scores.overall),
      },
      relevance: candidate.scores.overall < 0.55
        ? "not-relevant"
        : candidate.relevance,
      relatedDiscoveryIds: uniqueStrings(
        candidate.relatedDiscoveryIds.filter((id) =>
          validDiscoveryIds.has(id),
        ),
      ),
      status: "suggested",
      foundAt,
    }));
}

export function enrichInterestTrends(
  interests: ResearchInterest[],
  previousInterests: ResearchInterest[],
  language: string,
  now = new Date(),
): ResearchInterest[] {
  const previousById = new Map(previousInterests.map((item) => [item.id, item]));
  return interests.map((interest) => {
    const previous = previousById.get(interest.id);
    const delta = previous ? interest.strength - previous.strength : 0;
    const observedRuns = (previous?.observedRuns ?? 0) + 1;
    const trend = !previous
      ? "new"
      : delta >= 0.08
        ? "rising"
        : delta <= -0.08
          ? "declining"
          : observedRuns >= 3
            ? "long-term"
            : "stable";
    return {
      ...interest,
      previousStrength: previous?.strength ?? null,
      trend,
      trendExplanation: describeTrend(trend, delta, language),
      firstDetectedAt: previous?.firstDetectedAt ?? now.toISOString(),
      observedRuns,
    };
  });
}

function describeTrend(
  trend: ResearchInterest["trend"],
  delta: number,
  language: string,
): string {
  const percentage = Math.abs(Math.round(delta * 100));
  if (language.toLowerCase().startsWith("de")) {
    if (trend === "new") return "Neu aus der persönlichen Bibliothek erkannt.";
    if (trend === "rising") return `Das Interesse ist um ${percentage} Prozentpunkte gestiegen.`;
    if (trend === "declining") return `Das Interesse ist um ${percentage} Prozentpunkte gesunken.`;
    if (trend === "long-term") return "Über mehrere Rechercheläufe stabiler Schwerpunkt.";
    return "Seit dem letzten Recherchelauf weitgehend stabil.";
  }
  if (trend === "new") return "Newly detected from the personal library.";
  if (trend === "rising") return `Interest increased by ${percentage} percentage points.`;
  if (trend === "declining") return `Interest decreased by ${percentage} percentage points.`;
  if (trend === "long-term") return "A stable focus across multiple research runs.";
  return "Largely stable since the previous research run.";
}

function compactGraph(graph: KnowledgeGraph) {
  return {
    language: graph.language,
    summary: graph.summary,
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      kind: node.kind,
      description: node.description,
      parentId: node.parentId,
      discoveryIds: node.discoveryIds,
      keywords: node.keywords,
      confidence: node.confidence,
    })),
    relations: graph.relations,
  };
}

function compactDiscoveries(discoveries: Discovery[]) {
  return discoveries.map((discovery) => ({
    id: discovery.id,
    title: discovery.improvedTitle || discovery.title,
    summary: discovery.summary ?? discovery.description ?? "",
    url: discovery.url ?? null,
    keywords: discovery.keywords,
    createdAt: discovery.createdAt,
  }));
}

function createCandidateId(url: string): string {
  return `research-${createHash("sha256")
    .update(normalizeUrl(url))
    .digest("hex")
    .slice(0, 16)}`;
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.trim().toLowerCase();
  }
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "research";
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function chunk<T>(values: T[], size: number): T[][] {
  return Array.from(
    { length: Math.ceil(values.length / size) },
    (_, index) => values.slice(index * size, (index + 1) * size),
  );
}

function normalizeScore(value: number): number {
  return Number(Math.min(1, Math.max(0, value)).toFixed(4));
}
