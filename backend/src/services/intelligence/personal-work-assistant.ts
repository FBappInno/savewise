import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod/v3";

import type {
  Discovery,
  KnowledgeGraph,
  PersonalKnowledgeProfile,
  ResearchCandidate,
  WorkAssistantRequest,
  WorkAssistantResult,
} from "@savewise/shared";

const WorkProductSchema = z.object({
  title: z.string().min(3).max(240),
  introduction: z.string().min(10).max(2000),
  sections: z.array(z.object({
    title: z.string().min(2).max(160),
    content: z.string().min(10).max(5000),
    discoveryIds: z.array(z.string()).max(50),
  })).min(1).max(20),
  libraryCitations: z.array(z.object({
    discoveryId: z.string(),
    contribution: z.string().min(3).max(800),
  })).max(50),
  researchCitations: z.array(z.object({
    candidateId: z.string(),
    contribution: z.string().min(3).max(800),
  })).max(20),
  limitations: z.array(z.string().min(3).max(1000)).max(20),
});

let openai: OpenAI | null = null;

export async function createPersonalWorkProduct(
  request: WorkAssistantRequest,
  discoveries: Discovery[],
  graph: KnowledgeGraph,
  profile: PersonalKnowledgeProfile,
  researchCandidates: ResearchCandidate[],
): Promise<WorkAssistantResult> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  if (discoveries.length === 0) throw new Error("No personal knowledge is available yet.");

  const verifiedResearch = request.includeVerifiedResearch
    ? researchCandidates
      .filter((candidate) =>
        candidate.relevance === "relevant" &&
        candidate.scores.trustworthiness >= 0.65 &&
        candidate.url.startsWith("https://"),
      )
      .sort((first, second) => second.scores.overall - first.scores.overall)
      .slice(0, 10)
    : [];
  const response = await getOpenAI().responses.parse({
    model: process.env.OPENAI_ASSISTANT_MODEL ?? "gpt-5.6-luna",
    instructions: [
      "You are the personal work assistant for SaveWise.",
      "The personal library is the primary source and defines the user's context.",
      "Create only the requested work product: meeting brief, presentation, project summary, learning plan, talk outline or business case.",
      "Every claim from the personal library must cite supplied discovery IDs.",
      "Verified research is optional supplemental context and must never silently replace personal knowledge.",
      "Use only supplied research candidate IDs and clearly cite every external addition.",
      "Never use general model knowledge or facts not present in either supplied evidence collection.",
      "If evidence is missing, state it under limitations instead of inventing content.",
      "Write in the instruction language, or the graph language when neutral.",
    ].join("\n"),
    input: JSON.stringify({
      task: request,
      personalProfile: profile,
      knowledgeGraph: compactGraph(graph),
      personalLibrary: discoveries.map(compactDiscovery),
      verifiedCurrentResearch: verifiedResearch.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        url: candidate.url,
        sourceName: candidate.sourceName,
        sourceType: candidate.sourceType,
        publishedAt: candidate.publishedAt ?? null,
        summary: candidate.summary,
        impact: candidate.impact,
        trustworthiness: candidate.scores.trustworthiness,
      })),
    }),
    text: { format: zodTextFormat(WorkProductSchema, "savewise_work_product") },
  });
  if (!response.output_parsed) throw new Error("AI returned no work product.");

  const validDiscoveries = new Map(discoveries.map((item) => [item.id, item]));
  const validResearch = new Map(verifiedResearch.map((item) => [item.id, item]));
  const parsed = response.output_parsed;
  return {
    id: `work-product-${Date.now()}`,
    type: request.type,
    title: parsed.title.trim(),
    introduction: parsed.introduction.trim(),
    sections: parsed.sections.map((section) => ({
      title: section.title.trim(),
      content: section.content.trim(),
      discoveryIds: uniqueStrings(section.discoveryIds.filter((id) => validDiscoveries.has(id))),
    })),
    libraryCitations: parsed.libraryCitations.flatMap((citation) => {
      const discovery = validDiscoveries.get(citation.discoveryId);
      return discovery ? [{
        discoveryId: discovery.id,
        title: discovery.improvedTitle || discovery.title,
        url: discovery.url,
        contribution: citation.contribution.trim(),
      }] : [];
    }),
    researchCitations: parsed.researchCitations.flatMap((citation) => {
      const candidate = validResearch.get(citation.candidateId);
      return candidate ? [{
        candidateId: candidate.id,
        title: candidate.title,
        url: candidate.url,
        sourceName: candidate.sourceName,
        contribution: citation.contribution.trim(),
      }] : [];
    }),
    limitations: uniqueStrings(parsed.limitations),
    generatedAt: new Date().toISOString(),
  };
}

function getOpenAI(): OpenAI {
  openai ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 90_000,
    maxRetries: 1,
  });
  return openai;
}

function compactDiscovery(discovery: Discovery) {
  return {
    id: discovery.id,
    title: discovery.improvedTitle || discovery.title,
    summary: discovery.summary ?? discovery.description ?? "",
    author: discovery.author ?? null,
    url: discovery.url ?? null,
    source: discovery.source,
    publishedAt: discovery.publishedAt ?? null,
    keywords: discovery.keywords,
    createdAt: discovery.createdAt,
  };
}

function compactGraph(graph: KnowledgeGraph) {
  return {
    language: graph.language,
    summary: graph.summary,
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      description: node.description,
      parentId: node.parentId,
      discoveryIds: node.discoveryIds,
      confidence: node.confidence,
    })),
    relations: graph.relations,
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
