import { createHash } from "node:crypto";

import type {
  IntelligenceLearningEvent,
  IntelligenceLearningTrigger,
  IntelligencePrediction,
  IntelligenceRecommendation,
  KnowledgeGraph,
  KnowledgeModelDelta,
  PersonalIntelligenceOverview,
  PersonalKnowledgeProfile,
  ResearchCandidate,
  ResearchState,
} from "@savewise/shared";

import {
  createGraphSnapshot,
  loadPersonalIntelligenceState,
  savePersonalIntelligenceState,
  type IntelligenceGraphSnapshot,
} from "../../persistence/intelligence/personal-intelligence-store";

const HISTORY_LIMIT = 100;

export async function recordLearningCycle(
  graph: KnowledgeGraph,
  trigger: IntelligenceLearningTrigger,
  discoveryId?: string,
): Promise<IntelligenceLearningEvent | null> {
  const state = await loadPersonalIntelligenceState();
  const currentSnapshot = createGraphSnapshot(graph);
  if (
    state.graphSnapshot?.fingerprint === currentSnapshot.fingerprint &&
    trigger === "graph-refined"
  ) {
    return null;
  }

  const delta = compareSnapshots(state.graphSnapshot, currentSnapshot);
  const version = state.modelVersion + 1;
  const createdAt = new Date().toISOString();
  const event: IntelligenceLearningEvent = {
    id: `learning-${version}-${createHash("sha256")
      .update(`${trigger}:${discoveryId ?? "graph"}:${currentSnapshot.fingerprint}`)
      .digest("hex")
      .slice(0, 12)}`,
    version,
    trigger,
    discoveryId,
    graphFingerprint: currentSnapshot.fingerprint,
    delta,
    explanation: describeDelta(delta, graph.language),
    createdAt,
  };
  await savePersonalIntelligenceState({
    modelVersion: version,
    events: [event, ...state.events].slice(0, HISTORY_LIMIT),
    graphSnapshot: currentSnapshot,
  });
  return event;
}

export async function buildPersonalIntelligenceOverview(
  graph: KnowledgeGraph,
  research: ResearchState,
  profile: PersonalKnowledgeProfile,
): Promise<PersonalIntelligenceOverview> {
  await recordLearningCycle(graph, "graph-refined");
  const state = await loadPersonalIntelligenceState();
  return {
    generatedAt: new Date().toISOString(),
    modelVersion: state.modelVersion,
    graphFingerprint: state.graphSnapshot?.fingerprint ?? graph.sourceFingerprint,
    latestLearningEvent: state.events[0] ?? null,
    learningHistory: state.events.slice(0, 20),
    predictions: derivePredictions(graph, research, profile),
    recommendations: deriveRecommendations(graph, research),
  };
}

export function compareSnapshots(
  previous: IntelligenceGraphSnapshot | null,
  current: IntelligenceGraphSnapshot,
): KnowledgeModelDelta {
  const previousNodes = new Map(previous?.nodes.map((node) => [node.id, node]) ?? []);
  const currentNodes = new Map(current.nodes.map((node) => [node.id, node]));
  const previousRelations = new Set(previous?.relations.map((relation) => relation.id) ?? []);
  const currentRelations = new Set(current.relations.map((relation) => relation.id));
  return {
    addedNodeIds: [...currentNodes.keys()].filter((id) => !previousNodes.has(id)),
    removedNodeIds: [...previousNodes.keys()].filter((id) => !currentNodes.has(id)),
    movedNodeIds: [...currentNodes.values()]
      .filter((node) => previousNodes.has(node.id) && previousNodes.get(node.id)?.parentId !== node.parentId)
      .map((node) => node.id),
    addedRelationIds: [...currentRelations].filter((id) => !previousRelations.has(id)),
    removedRelationIds: [...previousRelations].filter((id) => !currentRelations.has(id)),
    summaryChanged: previous !== null && previous.summary !== current.summary,
  };
}

export function derivePredictions(
  graph: KnowledgeGraph,
  research: ResearchState,
  profile: PersonalKnowledgeProfile,
): IntelligencePrediction[] {
  const validNodeIds = new Set(graph.nodes.map((node) => node.id));
  const predictions: IntelligencePrediction[] = [];
  for (const interest of research.interests) {
    const nodeIds = interest.nodeIds.filter((id) => validNodeIds.has(id));
    if (interest.trend === "new" || interest.trend === "rising") {
      predictions.push({
        id: `prediction-focus-${interest.id}`,
        kind: interest.trend === "new" ? "emerging-focus" : "next-interest",
        title: interest.title,
        explanation: interest.trendExplanation,
        confidence: interest.strength,
        nodeIds,
        discoveryIds: uniqueStrings(nodeIds.flatMap((id) =>
          graph.nodes.find((node) => node.id === id)?.discoveryIds ?? [])),
        suggestedTopics: interest.knowledgeGaps.slice(0, 5),
      });
    }
    if (interest.knowledgeGaps.length > 0) {
      predictions.push({
        id: `prediction-gap-${interest.id}`,
        kind: profile.projects.length > 0 ? "project-gap" : "next-interest",
        title: interest.knowledgeGaps[0] ?? interest.title,
        explanation: `Diese Wissenslücke wurde aus dem aktuellen Schwerpunkt „${interest.title}“ abgeleitet.`,
        confidence: normalizeScore((interest.strength + 0.65) / 2),
        nodeIds,
        discoveryIds: [],
        suggestedTopics: interest.knowledgeGaps.slice(0, 5),
      });
    }
  }
  return uniqueById(predictions)
    .sort((first, second) => second.confidence - first.confidence)
    .slice(0, 10);
}

export function deriveRecommendations(
  graph: KnowledgeGraph,
  research: ResearchState,
): IntelligenceRecommendation[] {
  const candidateRecommendations = research.candidates
    .filter((candidate) => candidate.status === "suggested")
    .map((candidate) => recommendationFromCandidate(candidate, research));
  const similarDiscoveries = graph.nodes
    .filter((node) => node.discoveryIds.length >= 2)
    .slice(0, 6)
    .map((node): IntelligenceRecommendation => ({
      id: `recommendation-similar-${node.id}`,
      kind: "similar-discovery",
      title: node.title,
      description: `${node.discoveryIds.length} gespeicherte Discoveries behandeln diesen gemeinsamen Wissensbereich.`,
      confidence: node.confidence,
      nodeIds: [node.id],
      discoveryIds: node.discoveryIds,
    }));
  return uniqueById([...candidateRecommendations, ...similarDiscoveries])
    .sort((first, second) => second.confidence - first.confidence)
    .slice(0, 20);
}

function recommendationFromCandidate(
  candidate: ResearchCandidate,
  research: ResearchState,
): IntelligenceRecommendation {
  const interest = research.interests.find((item) => item.id === candidate.interestId);
  return {
    id: `recommendation-source-${candidate.id}`,
    kind: mapRecommendationKind(candidate.sourceType),
    title: candidate.title,
    description: candidate.decisionReason,
    confidence: candidate.scores.overall,
    nodeIds: interest?.nodeIds ?? [],
    discoveryIds: candidate.relatedDiscoveryIds,
    researchCandidateId: candidate.id,
    url: candidate.url,
  };
}

function mapRecommendationKind(
  sourceType: ResearchCandidate["sourceType"],
): IntelligenceRecommendation["kind"] {
  if (sourceType === "paper" || sourceType === "whitepaper") return "literature";
  if (sourceType === "study") return "study";
  if (sourceType === "video") return "video";
  if (sourceType === "company" || sourceType === "startup") return "company";
  if (sourceType === "product" || sourceType === "technology") return "product";
  return "new-source";
}

function describeDelta(delta: KnowledgeModelDelta, language: string): string {
  const values = [
    `${delta.addedNodeIds.length} neue Knoten`,
    `${delta.removedNodeIds.length} entfernte oder zusammengeführte Knoten`,
    `${delta.movedNodeIds.length} neu eingeordnete Knoten`,
    `${delta.addedRelationIds.length} neue Beziehungen`,
  ];
  if (language.toLowerCase().startsWith("de")) return values.join(", ") + ".";
  return `${delta.addedNodeIds.length} nodes added, ${delta.removedNodeIds.length} removed or merged, ${delta.movedNodeIds.length} reorganized, and ${delta.addedRelationIds.length} relations added.`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function uniqueById<T extends { id: string }>(values: T[]): T[] {
  return [...new Map(values.map((value) => [value.id, value])).values()];
}

function normalizeScore(value: number): number {
  return Number(Math.min(1, Math.max(0, value)).toFixed(4));
}
