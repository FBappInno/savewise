import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod/v3";

import type {
  Discovery,
  KnowledgeAnswer,
  KnowledgeGraph,
  SecondBrainOverview,
} from "@savewise/shared";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 90_000,
  maxRetries: 1,
});

const AnswerSchema = z.object({
  answer: z.string().min(20).max(5000),
  confidence: z.number().min(0).max(1),
  relatedNodeIds: z.array(z.string()).max(30),
  citations: z
    .array(
      z.object({
        discoveryId: z.string().min(1),
        contribution: z.string().min(5).max(500),
      }),
    )
    .max(30),
  contradictions: z
    .array(
      z.object({
        title: z.string().min(3).max(160),
        explanation: z.string().min(10).max(1000),
        discoveryIds: z.array(z.string()).min(2).max(20),
      }),
    )
    .max(12),
});

const OverviewSchema = z.object({
  knowledgeSummary: z.string().min(20).max(3000),
  gaps: z
    .array(
      z.object({
        id: z.string().min(2).max(100),
        title: z.string().min(2).max(120),
        description: z.string().min(10).max(700),
        relatedNodeIds: z.array(z.string()).max(20),
        suggestedTopics: z.array(z.string()).min(1).max(8),
        priority: z.number().min(0).max(1),
      }),
    )
    .max(12),
  evolution: z.object({
    summary: z.string().min(20).max(2000),
    newFocuses: z.array(z.string()).max(12),
    decliningFocuses: z.array(z.string()).max(12),
    developments: z
      .array(
        z.object({
          title: z.string().min(2).max(140),
          description: z.string().min(10).max(700),
          from: z.string().min(2).max(80),
          to: z.string().min(2).max(80),
          nodeIds: z.array(z.string()).max(20),
        }),
      )
      .max(12),
  }),
});

export async function answerKnowledgeQuestion(
  question: string,
  discoveries: Discovery[],
  graph: KnowledgeGraph,
): Promise<KnowledgeAnswer> {
  requireKnowledge(discoveries);

  const response = await openai.responses.parse({
    model: "gpt-4.1-mini",
    instructions: [
      "You are SaveWise Second Brain.",
      "Answer the user's question exclusively from their saved discoveries and knowledge graph.",
      "Synthesize information across all relevant discoveries into one coherent answer.",
      "Never respond with a mere list of discoveries.",
      "Clearly say when the saved knowledge is insufficient.",
      "Identify genuine contradictions between sources; do not manufacture disagreement.",
      "Use only discovery IDs and graph node IDs present in the input.",
      "Citations must explain what each source contributes to the synthesis.",
      "Answer in the language of the user's question.",
    ].join("\n"),
    input: JSON.stringify({
      question,
      knowledgeGraph: compactGraph(graph),
      discoveries: compactDiscoveries(discoveries),
    }),
    text: {
      format: zodTextFormat(
        AnswerSchema,
        "savewise_knowledge_answer",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("AI returned no knowledge answer.");
  }

  const validDiscoveries = new Map(
    discoveries.map((discovery) => [discovery.id, discovery]),
  );
  const validNodeIds = new Set(
    graph.nodes.map((node) => node.id),
  );

  return {
    question,
    answer: response.output_parsed.answer.trim(),
    confidence: normalizeScore(response.output_parsed.confidence),
    relatedNodeIds: uniqueStrings(
      response.output_parsed.relatedNodeIds.filter((id) =>
        validNodeIds.has(id),
      ),
    ),
    citations: response.output_parsed.citations.flatMap((citation) => {
      const discovery = validDiscoveries.get(citation.discoveryId);

      return discovery
        ? [{
            discoveryId: discovery.id,
            title: discovery.improvedTitle || discovery.title,
            url: discovery.url,
            contribution: citation.contribution.trim(),
          }]
        : [];
    }),
    contradictions: response.output_parsed.contradictions
      .map((contradiction) => ({
        ...contradiction,
        discoveryIds: uniqueStrings(
          contradiction.discoveryIds.filter((id) =>
            validDiscoveries.has(id),
          ),
        ),
      }))
      .filter((contradiction) => contradiction.discoveryIds.length >= 2),
    generatedAt: new Date().toISOString(),
  };
}

export async function analyzeSecondBrain(
  discoveries: Discovery[],
  graph: KnowledgeGraph,
): Promise<SecondBrainOverview> {
  requireKnowledge(discoveries);

  const response = await openai.responses.parse({
    model: "gpt-4.1-mini",
    instructions: [
      "You are SaveWise Second Brain analyzing a user's complete saved knowledge.",
      "Identify meaningful knowledge gaps adjacent to areas with real existing depth.",
      "Do not recommend generic topics unrelated to the user's graph.",
      "Compare discovery dates and graph coverage to identify new focuses, declining focuses and increasingly specialized knowledge.",
      "A declining focus requires older evidence and little or no recent activity.",
      "A new focus requires recent evidence relative to the supplied timeline.",
      "Describe development as changes in knowledge depth, not merely changes in item counts.",
      "Use only graph node IDs present in the input.",
      "Write in the dominant language of the knowledge graph.",
    ].join("\n"),
    input: JSON.stringify({
      generatedAt: new Date().toISOString(),
      knowledgeGraph: compactGraph(graph),
      discoveries: compactDiscoveries(discoveries),
    }),
    text: {
      format: zodTextFormat(
        OverviewSchema,
        "savewise_second_brain_overview",
      ),
    },
  });

  if (!response.output_parsed) {
    throw new Error("AI returned no Second Brain analysis.");
  }

  const validNodeIds = new Set(
    graph.nodes.map((node) => node.id),
  );
  const parsed = response.output_parsed;

  return {
    generatedAt: new Date().toISOString(),
    knowledgeSummary: parsed.knowledgeSummary.trim(),
    gaps: parsed.gaps.map((gap) => ({
      ...gap,
      id: normalizeKey(gap.id),
      relatedNodeIds: uniqueStrings(
        gap.relatedNodeIds.filter((id) => validNodeIds.has(id)),
      ),
      suggestedTopics: uniqueStrings(gap.suggestedTopics),
      priority: normalizeScore(gap.priority),
    })),
    evolution: {
      ...parsed.evolution,
      newFocuses: uniqueStrings(parsed.evolution.newFocuses),
      decliningFocuses: uniqueStrings(parsed.evolution.decliningFocuses),
      developments: parsed.evolution.developments.map(
        (development) => ({
          ...development,
          nodeIds: uniqueStrings(
            development.nodeIds.filter((id) => validNodeIds.has(id)),
          ),
        }),
      ),
    },
  };
}

function requireKnowledge(discoveries: Discovery[]): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (discoveries.length === 0) {
    throw new Error("No saved knowledge is available yet.");
  }
}

function compactDiscoveries(discoveries: Discovery[]) {
  return discoveries.map((discovery) => ({
    id: discovery.id,
    title: discovery.improvedTitle || discovery.title,
    summary: discovery.summary ?? discovery.description ?? "",
    author: discovery.author ?? null,
    url: discovery.url ?? null,
    keywords: discovery.keywords,
    language: discovery.language ?? null,
    createdAt: discovery.createdAt,
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
      aliases: node.aliases,
      keywords: node.keywords,
      confidence: node.confidence,
    })),
    relations: graph.relations,
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeScore(value: number): number {
  return Number(Math.min(1, Math.max(0, value)).toFixed(4));
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "knowledge-gap";
}
