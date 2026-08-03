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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120_000,
  maxRetries: 1,
});

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
      "startup",
      "company",
      "technology",
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
): Promise<{
  interests: ResearchInterest[];
  candidates: ResearchCandidate[];
}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (discoveries.length === 0) {
    return { interests: [], candidates: [] };
  }

  const interestResponse = await openai.responses.parse({
    model: "gpt-4.1-mini",
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

  const interests = validateInterests(
    interestResponse.output_parsed.interests,
    graph,
  );
  if (interests.length < 3) {
    throw new Error(
      "AI interest analysis was not sufficiently grounded in the knowledge graph.",
    );
  }
  const interestBatches = chunk(interests, 3);
  const batchResults = await Promise.allSettled(
    interestBatches.map((batch, index) => researchInterestBatch(
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
  const candidates = validateCandidates(
    candidateResults.flat(),
    interests,
    discoveries,
  );
  const coveredInterestCount = new Set(
    candidates.map((candidate) => candidate.interestId),
  ).size;
  const requiredInterestCount = Math.min(5, interests.length);
  if (coveredInterestCount < requiredInterestCount) {
    throw new Error(
      `AI research covered ${coveredInterestCount} interests; ${requiredInterestCount} are required.`,
    );
  }

  return { interests, candidates };
}

async function researchInterestBatch(
  interests: ResearchInterest[],
  discoveries: Discovery[],
  language: string,
  batchIndex: number,
): Promise<z.infer<typeof CandidateAnalysisSchema>["candidates"]> {
  const response = await openai.responses.parse({
    model: "gpt-4.1-mini",
    max_output_tokens: 5_000,
    tools: [{ type: "web_search" }],
    tool_choice: "required",
    include: ["web_search_call.action.sources"],
    instructions: [
      "You are the autonomous web research agent for SaveWise.",
      "The supplied interests are locked and grounded in the user's knowledge. Research only these interests and their listed gaps.",
      "Search the live web for recent, trustworthy and high-value primary or reputable specialist sources.",
      "Return one or two qualified candidates per supplied interest and cover every supplied interest.",
      "Do not suggest existing URLs. Omit duplicates and candidates with an overall score below 0.55.",
      "Score relevance, quality, recency, trustworthiness, new knowledge value and gap coverage independently.",
      "Compare candidates with existing knowledge: confirms, contradicts, extends or new-perspective. Never manufacture contradictions.",
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
        candidate.scores.overall < 0.55 ||
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
      relatedDiscoveryIds: uniqueStrings(
        candidate.relatedDiscoveryIds.filter((id) =>
          validDiscoveryIds.has(id),
        ),
      ),
      status: "suggested",
      foundAt,
    }));
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
