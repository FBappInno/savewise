import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod/v3";

import type {
  Discovery,
  KnowledgeAnswer,
  KnowledgeConversationMessage,
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeGraph,
  PersonalKnowledgeProfile,
  SecondBrainOverview,
} from "@savewise/shared";

const ASSISTANT_MODEL = process.env.OPENAI_ASSISTANT_MODEL ?? "gpt-5.6-luna";

const SynthesisSchema = z.object({
  overallInsight: z.string().min(10).max(2000),
  sharedStatements: z.array(z.string().min(5).max(700)).max(12),
  differingStatements: z.array(z.string().min(5).max(700)).max(12),
  openQuestions: z.array(z.string().min(5).max(500)).max(12),
  practicalConclusions: z.array(z.string().min(5).max(700)).max(12),
});

const AnswerSchema = z.object({
  answer: z.string().min(20).max(5000),
  confidence: z.number().min(0).max(1),
  relatedNodeIds: z.array(z.string()).max(30),
  citations: z.array(z.object({
    discoveryId: z.string().min(1),
    contribution: z.string().min(5).max(500),
  })).max(30),
  contradictions: z.array(z.object({
    title: z.string().min(3).max(160),
    explanation: z.string().min(10).max(1000),
    discoveryIds: z.array(z.string()).min(2).max(20),
  })).max(12),
  synthesis: SynthesisSchema,
  insufficientKnowledge: z.string().max(1000).nullable(),
});

const QualityDimensionSchema = z.object({
  score: z.number().min(0).max(1),
  summary: z.string().min(10).max(700),
});

const OverviewSchema = z.object({
  knowledgeSummary: z.string().min(20).max(3000),
  gaps: z.array(z.object({
    id: z.string().min(2).max(100),
    title: z.string().min(2).max(120),
    description: z.string().min(10).max(700),
    relatedNodeIds: z.array(z.string()).max(20),
    suggestedTopics: z.array(z.string()).min(1).max(8),
    priority: z.number().min(0).max(1),
  })).max(12),
  evolution: z.object({
    summary: z.string().min(20).max(2000),
    newFocuses: z.array(z.string()).max(12),
    decliningFocuses: z.array(z.string()).max(12),
    developments: z.array(z.object({
      title: z.string().min(2).max(140),
      description: z.string().min(10).max(700),
      from: z.string().min(2).max(80),
      to: z.string().min(2).max(80),
      nodeIds: z.array(z.string()).max(20),
    })).max(12),
  }),
  quality: z.object({
    overallScore: z.number().min(0).max(1),
    completeness: QualityDimensionSchema,
    recency: QualityDimensionSchema,
    sourceDiversity: QualityDimensionSchema,
    trustworthiness: QualityDimensionSchema,
    contradictions: QualityDimensionSchema,
    redundancy: QualityDimensionSchema,
    findings: z.array(z.string().min(5).max(700)).max(12),
  }),
  profile: z.object({
    interests: z.array(z.string().min(2).max(100)).max(20),
    projects: z.array(z.string().min(2).max(140)).max(20),
    learningGoals: z.array(z.string().min(2).max(180)).max(20),
    developmentSummary: z.string().min(10).max(2000),
  }),
});

const DocumentSchema = z.object({
  title: z.string().min(3).max(180),
  introduction: z.string().min(10).max(2000),
  sections: z.array(z.object({
    title: z.string().min(2).max(160),
    content: z.string().min(10).max(4000),
    discoveryIds: z.array(z.string()).max(30),
  })).min(1).max(30),
  citations: z.array(z.object({
    discoveryId: z.string().min(1),
    contribution: z.string().min(5).max(500),
  })).max(40),
  limitations: z.array(z.string().min(5).max(700)).max(12),
});

export async function answerKnowledgeQuestion(
  question: string,
  discoveries: Discovery[],
  graph: KnowledgeGraph,
  history: KnowledgeConversationMessage[] = [],
  profile?: PersonalKnowledgeProfile,
): Promise<KnowledgeAnswer> {
  requireKnowledge(discoveries);
  const response = await getOpenAI().responses.parse({
    model: ASSISTANT_MODEL,
    instructions: [
      "You are SaveWise Personal Knowledge Assistant.",
      "The personal library is the only factual source. Never answer from general model knowledge or the internet.",
      "Use conversation history only to resolve context, never as factual evidence.",
      "Synthesize all relevant discoveries into a coherent answer instead of listing items.",
      "Clearly state missing or partial evidence in insufficientKnowledge; otherwise set it to null.",
      "Identify genuine contradictions only when saved sources conflict.",
      "Use only discovery and graph node IDs present in the input.",
      "Every citation must explain its contribution.",
      "Structure synthesis into overall insight, common statements, differences, open questions and practical conclusions.",
      "Leave synthesis arrays empty when the library does not support that category.",
      "Use the personal profile only to adapt emphasis, never as factual evidence.",
      "Answer in the language of the user's question.",
    ].join("\n"),
    input: JSON.stringify({
      question,
      conversationHistory: history.slice(-12),
      personalProfile: profile ?? null,
      knowledgeGraph: compactGraph(graph),
      discoveries: compactDiscoveries(discoveries),
    }),
    text: { format: zodTextFormat(AnswerSchema, "savewise_knowledge_answer") },
  });
  if (!response.output_parsed) throw new Error("AI returned no knowledge answer.");

  const validDiscoveries = new Map(discoveries.map((discovery) => [discovery.id, discovery]));
  const validNodeIds = new Set(graph.nodes.map((node) => node.id));
  const parsed = response.output_parsed;
  return {
    question,
    answer: parsed.answer.trim(),
    confidence: normalizeScore(parsed.confidence),
    relatedNodeIds: uniqueStrings(parsed.relatedNodeIds.filter((id) => validNodeIds.has(id))),
    citations: mapCitations(parsed.citations, validDiscoveries),
    contradictions: parsed.contradictions.map((contradiction) => ({
      title: contradiction.title.trim(),
      explanation: contradiction.explanation.trim(),
      discoveryIds: uniqueStrings(contradiction.discoveryIds.filter((id) => validDiscoveries.has(id))),
    })).filter((contradiction) => contradiction.discoveryIds.length >= 2),
    synthesis: {
      overallInsight: parsed.synthesis.overallInsight.trim(),
      sharedStatements: uniqueStrings(parsed.synthesis.sharedStatements),
      differingStatements: uniqueStrings(parsed.synthesis.differingStatements),
      openQuestions: uniqueStrings(parsed.synthesis.openQuestions),
      practicalConclusions: uniqueStrings(parsed.synthesis.practicalConclusions),
    },
    insufficientKnowledge: parsed.insufficientKnowledge?.trim() || null,
    generatedAt: new Date().toISOString(),
  };
}

export async function analyzeSecondBrain(
  discoveries: Discovery[],
  graph: KnowledgeGraph,
  previousProfile?: PersonalKnowledgeProfile,
): Promise<SecondBrainOverview> {
  requireKnowledge(discoveries);
  const response = await getOpenAI().responses.parse({
    model: ASSISTANT_MODEL,
    instructions: [
      "Analyze the complete personal SaveWise library without outside knowledge.",
      "Identify knowledge gaps only next to areas with real existing depth.",
      "Compare dates and coverage to identify new, declining and increasingly specialized focuses.",
      "Evaluate completeness, recency, source diversity, trustworthiness, contradictions and redundancy separately.",
      "Source diversity must consider source types, authors and domains, not item count alone.",
      "Metadata confidence is not proof that a source is authoritative.",
      "Infer interests, projects and learning goals only from repeated or explicit evidence; otherwise leave arrays empty.",
      "Preserve previous profile information only while the current library still supports it.",
      "Use only supplied node IDs and write in the graph language.",
    ].join("\n"),
    input: JSON.stringify({
      generatedAt: new Date().toISOString(),
      personalProfile: previousProfile ?? null,
      knowledgeGraph: compactGraph(graph),
      discoveries: compactDiscoveries(discoveries),
    }),
    text: { format: zodTextFormat(OverviewSchema, "savewise_second_brain_overview") },
  }).catch((error) => {
    console.warn("AI Second Brain overview failed; using grounded fallback:", error);
    return null;
  });
  if (!response?.output_parsed) {
    return createGroundedOverview(discoveries, graph, previousProfile);
  }

  const validNodeIds = new Set(graph.nodes.map((node) => node.id));
  const parsed = response.output_parsed;
  return {
    generatedAt: new Date().toISOString(),
    knowledgeSummary: parsed.knowledgeSummary.trim(),
    gaps: parsed.gaps.map((gap) => ({
      ...gap,
      id: normalizeKey(gap.id),
      relatedNodeIds: uniqueStrings(gap.relatedNodeIds.filter((id) => validNodeIds.has(id))),
      suggestedTopics: uniqueStrings(gap.suggestedTopics),
      priority: normalizeScore(gap.priority),
    })),
    evolution: {
      summary: parsed.evolution.summary.trim(),
      newFocuses: uniqueStrings(parsed.evolution.newFocuses),
      decliningFocuses: uniqueStrings(parsed.evolution.decliningFocuses),
      developments: parsed.evolution.developments.map((development) => ({
        ...development,
        nodeIds: uniqueStrings(development.nodeIds.filter((id) => validNodeIds.has(id))),
      })),
    },
    quality: {
      overallScore: normalizeScore(parsed.quality.overallScore),
      completeness: normalizeQualityDimension(parsed.quality.completeness),
      recency: normalizeQualityDimension(parsed.quality.recency),
      sourceDiversity: normalizeQualityDimension(parsed.quality.sourceDiversity),
      trustworthiness: normalizeQualityDimension(parsed.quality.trustworthiness),
      contradictions: normalizeQualityDimension(parsed.quality.contradictions),
      redundancy: normalizeQualityDimension(parsed.quality.redundancy),
      findings: uniqueStrings(parsed.quality.findings),
    },
    profile: {
      interests: uniqueStrings(parsed.profile.interests),
      projects: uniqueStrings(parsed.profile.projects),
      learningGoals: uniqueStrings(parsed.profile.learningGoals),
      frequentQuestions: previousProfile?.frequentQuestions ?? [],
      developmentSummary: parsed.profile.developmentSummary.trim(),
      updatedAt: new Date().toISOString(),
    },
  };
}

export async function generateKnowledgeDocument(
  type: KnowledgeDocumentType,
  instruction: string,
  discoveries: Discovery[],
  graph: KnowledgeGraph,
  profile?: PersonalKnowledgeProfile,
): Promise<KnowledgeDocument> {
  requireKnowledge(discoveries);
  const response = await getOpenAI().responses.parse({
    model: ASSISTANT_MODEL,
    instructions: [
      "Create a document exclusively from the user's personal SaveWise library.",
      "Never add external facts, examples, recommendations or background knowledge.",
      "Every substantive section must reference supporting discovery IDs.",
      "State missing evidence in limitations instead of filling gaps.",
      "Adapt the structure to the requested type: summary, learning plan, presentation outline, blog article, checklist or project overview.",
      "For presentations, make each section one concise slide. For checklists, use actionable checkbox-style lines.",
      "Write in the instruction language, or graph language when neutral.",
    ].join("\n"),
    input: JSON.stringify({
      documentType: type,
      instruction,
      personalProfile: profile ?? null,
      knowledgeGraph: compactGraph(graph),
      discoveries: compactDiscoveries(discoveries),
    }),
    text: { format: zodTextFormat(DocumentSchema, "savewise_knowledge_document") },
  });
  if (!response.output_parsed) throw new Error("AI returned no knowledge document.");

  const validDiscoveries = new Map(discoveries.map((discovery) => [discovery.id, discovery]));
  const parsed = response.output_parsed;
  return {
    id: `document-${Date.now()}`,
    type,
    title: parsed.title.trim(),
    introduction: parsed.introduction.trim(),
    sections: parsed.sections.map((section) => ({
      title: section.title.trim(),
      content: section.content.trim(),
      discoveryIds: uniqueStrings(section.discoveryIds.filter((id) => validDiscoveries.has(id))),
    })),
    citations: mapCitations(parsed.citations, validDiscoveries),
    limitations: uniqueStrings(parsed.limitations),
    generatedAt: new Date().toISOString(),
  };
}

function requireKnowledge(discoveries: Discovery[]): void {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  if (discoveries.length === 0) throw new Error("No saved knowledge is available yet.");
}

function getOpenAI(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 90_000,
    maxRetries: 1,
  });
}

function compactDiscoveries(discoveries: Discovery[]) {
  return discoveries.map((discovery) => ({
    id: discovery.id,
    title: discovery.improvedTitle || discovery.title,
    summary: discovery.summary ?? discovery.description ?? "",
    author: discovery.author ?? null,
    url: discovery.url ?? null,
    source: discovery.source,
    publishedAt: discovery.publishedAt ?? null,
    keywords: discovery.keywords,
    topics: discovery.topics,
    language: discovery.language ?? null,
    confidence: discovery.confidence ?? null,
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

function mapCitations(
  citations: Array<{ discoveryId: string; contribution: string }>,
  discoveries: Map<string, Discovery>,
) {
  return citations.flatMap((citation) => {
    const discovery = discoveries.get(citation.discoveryId);
    return discovery ? [{
      discoveryId: discovery.id,
      title: discovery.improvedTitle || discovery.title,
      url: discovery.url,
      contribution: citation.contribution.trim(),
    }] : [];
  });
}

function normalizeQualityDimension(dimension: { score: number; summary: string }) {
  return { score: normalizeScore(dimension.score), summary: dimension.summary.trim() };
}

export function createGroundedOverview(
  discoveries: Discovery[],
  graph: KnowledgeGraph,
  previousProfile?: PersonalKnowledgeProfile,
): SecondBrainOverview {
  const now = Date.now();
  const recentDiscoveries = discoveries.filter((discovery) => {
    const timestamp = new Date(discovery.createdAt).getTime();
    return Number.isFinite(timestamp) && now - timestamp <= 180 * 24 * 60 * 60 * 1000;
  });
  const rootNodes = graph.rootNodeIds
    .map((id) => graph.nodes.find((node) => node.id === id))
    .filter((node): node is KnowledgeGraph["nodes"][number] => Boolean(node));
  const leafNodes = graph.nodes.filter((node) => node.childIds.length === 0);
  const sourceTypes = new Set(discoveries.map((discovery) => discovery.source));
  const sourceDomains = new Set(discoveries.flatMap((discovery) => {
    try { return discovery.url ? [new URL(discovery.url).hostname] : []; } catch { return []; }
  }));
  const averageConfidence = discoveries.reduce(
    (total, discovery) => total + (discovery.confidence ?? 0.5),
    0,
  ) / Math.max(1, discoveries.length);
  const uniqueTitles = new Set(discoveries.map((discovery) =>
    (discovery.improvedTitle || discovery.title).toLocaleLowerCase().trim(),
  ));
  const contrastRelations = graph.relations.filter((relation) => relation.kind === "contrasts");
  const diversityScore = Math.min(1, (sourceTypes.size + sourceDomains.size) / Math.max(4, discoveries.length * 0.35));
  const completenessScore = Math.min(1, discoveries.length / Math.max(5, leafNodes.length * 2));
  const recencyScore = recentDiscoveries.length / Math.max(1, discoveries.length);
  const redundancyScore = uniqueTitles.size / Math.max(1, discoveries.length);
  const contradictionScore = 1 - Math.min(1, contrastRelations.length / Math.max(1, discoveries.length / 3));
  const scores = [
    completenessScore, recencyScore, diversityScore,
    averageConfidence * 0.8, contradictionScore, redundancyScore,
  ];
  const german = graph.language.toLowerCase().startsWith("de");
  const summary = (de: string, en: string) => german ? de : en;

  return {
    generatedAt: new Date().toISOString(),
    knowledgeSummary: graph.summary,
    gaps: leafNodes.filter((node) => node.discoveryIds.length <= 1).slice(0, 8).map((node) => ({
      id: `limited-${normalizeKey(node.id)}`,
      title: summary(`${node.title} ist erst knapp abgedeckt`, `${node.title} has limited coverage`),
      description: summary(
        `Zu ${node.title} enthält die Bibliothek höchstens eine Discovery. Weitere unabhängige Quellen würden die Perspektive verbreitern.`,
        `The library contains at most one discovery about ${node.title}. More independent sources would broaden coverage.`,
      ),
      relatedNodeIds: [node.id],
      suggestedTopics: [node.title],
      priority: 0.65,
    })),
    evolution: {
      summary: summary(
        `${recentDiscoveries.length} von ${discoveries.length} Discoveries wurden innerhalb der letzten 180 Tage gespeichert.`,
        `${recentDiscoveries.length} of ${discoveries.length} discoveries were saved during the last 180 days.`,
      ),
      newFocuses: rootNodes.filter((node) => node.discoveryIds.some((id) =>
        recentDiscoveries.some((discovery) => discovery.id === id),
      )).map((node) => node.title).slice(0, 12),
      decliningFocuses: [],
      developments: [],
    },
    quality: {
      overallScore: normalizeScore(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      completeness: { score: normalizeScore(completenessScore), summary: summary("Abdeckung anhand der Tiefe und Anzahl gespeicherter Quellen.", "Coverage based on graph depth and saved source count.") },
      recency: { score: normalizeScore(recencyScore), summary: summary("Anteil der Discoveries aus den letzten 180 Tagen.", "Share of discoveries saved within the last 180 days.") },
      sourceDiversity: { score: normalizeScore(diversityScore), summary: summary(`${sourceTypes.size} Quellentypen und ${sourceDomains.size} Domains.`, `${sourceTypes.size} source types and ${sourceDomains.size} domains.`) },
      trustworthiness: { score: normalizeScore(averageConfidence * 0.8), summary: summary("Vorsichtige Näherung aus Analyse-Confidence; keine redaktionelle Quellenprüfung.", "Conservative approximation from analysis confidence; not an editorial source audit.") },
      contradictions: { score: normalizeScore(contradictionScore), summary: summary(`${contrastRelations.length} erkannte Widerspruchsbeziehungen.`, `${contrastRelations.length} detected contradiction relations.`) },
      redundancy: { score: normalizeScore(redundancyScore), summary: summary("Anteil eindeutig betitelter Discoveries.", "Share of uniquely titled discoveries.") },
      findings: [summary(
        `Die Bibliothek verteilt sich auf ${sourceDomains.size} unterschiedliche Domains.`,
        `The library spans ${sourceDomains.size} different domains.`,
      )],
    },
    profile: {
      interests: rootNodes.sort((left, right) => right.discoveryIds.length - left.discoveryIds.length)
        .map((node) => node.title).slice(0, 12),
      projects: previousProfile?.projects ?? [],
      learningGoals: previousProfile?.learningGoals ?? [],
      frequentQuestions: previousProfile?.frequentQuestions ?? [],
      developmentSummary: summary(
        "Das Profil wird aus wiederkehrenden Themen, Fragen und der zeitlichen Wissensentwicklung abgeleitet.",
        "The profile is derived from recurring topics, questions and knowledge development over time.",
      ),
      updatedAt: new Date().toISOString(),
    },
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeScore(value: number): number {
  return Number(Math.min(1, Math.max(0, value)).toFixed(4));
}

function normalizeKey(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "knowledge-gap";
}
