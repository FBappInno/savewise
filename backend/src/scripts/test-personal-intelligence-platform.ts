import assert from "node:assert/strict";
import test from "node:test";

import type {
  KnowledgeGraph,
  PersonalKnowledgeProfile,
  ResearchState,
} from "@savewise/shared";

import { createGraphSnapshot } from "../persistence/intelligence/personal-intelligence-store";
import {
  compareSnapshots,
  derivePredictions,
  deriveRecommendations,
} from "../services/intelligence/personal-intelligence-service";

const graph: KnowledgeGraph = {
  generatedAt: "2026-08-04T08:00:00.000Z",
  sourceFingerprint: "discoveries-v2",
  language: "de",
  summary: "LLMs und Vector Databases",
  rootNodeIds: ["node-ai"],
  nodes: [
    node("node-ai", null, ["discovery-llm", "discovery-vector"]),
    node("node-llms", "node-ai", ["discovery-llm"]),
    node("node-vector", "node-ai", ["discovery-vector"]),
  ],
  relations: [{
    id: "relation-llm-vector",
    sourceId: "node-llms",
    targetId: "node-vector",
    kind: "depends-on",
    strength: 0.8,
    reason: "Retrieval",
    evidenceDiscoveryIds: ["discovery-llm", "discovery-vector"],
  }],
};

const research: ResearchState = {
  lastRunAt: "2026-08-04T08:00:00.000Z",
  nextRecommendedRunAt: "2026-08-05T08:00:00.000Z",
  interests: [{
    id: "ai",
    title: "AI",
    description: "Current AI focus",
    nodeIds: ["node-ai", "missing-node"],
    discoveryCount: 2,
    strength: 0.9,
    previousStrength: 0.7,
    trend: "rising",
    trendExplanation: "Das Interesse steigt.",
    firstDetectedAt: "2026-08-01T08:00:00.000Z",
    observedRuns: 3,
    knowledgeGaps: ["Vector database evaluation"],
  }],
  candidates: [{
    id: "research-paper",
    title: "Vector Database Benchmark",
    url: "https://example.org/vector-benchmark",
    sourceName: "Example University",
    sourceType: "paper",
    publishedAt: "2026-08-01",
    summary: "A current benchmark.",
    interestId: "ai",
    scores: {
      relevance: 0.95,
      quality: 0.9,
      recency: 0.95,
      trustworthiness: 0.9,
      knowledgeValue: 0.9,
      gapCoverage: 0.95,
      overall: 0.92,
    },
    relevance: "relevant",
    decisionReason: "Closes the current evaluation gap.",
    impact: "extends",
    impactExplanation: "Adds benchmarking evidence.",
    relatedDiscoveryIds: ["discovery-vector"],
    status: "suggested",
    foundAt: "2026-08-04T08:00:00.000Z",
  }],
  insights: [],
  briefings: [],
};

const profile: PersonalKnowledgeProfile = {
  interests: ["AI"],
  projects: ["RAG prototype"],
  learningGoals: [],
  frequentQuestions: [],
  developmentSummary: "",
  updatedAt: "2026-08-04T08:00:00.000Z",
};

test("structural graph changes are versionable even with the same source fingerprint", () => {
  const previousGraph: KnowledgeGraph = {
    ...graph,
    summary: "LLMs",
    nodes: [
      node("node-ai", null, ["discovery-llm"]),
      node("node-llms", null, ["discovery-llm"]),
      node("node-old", "node-ai", []),
    ],
    relations: [],
  };
  const previous = createGraphSnapshot(previousGraph);
  const current = createGraphSnapshot(graph);
  const delta = compareSnapshots(previous, current);

  assert.notEqual(previous.fingerprint, current.fingerprint);
  assert.deepEqual(delta.addedNodeIds, ["node-vector"]);
  assert.deepEqual(delta.removedNodeIds, ["node-old"]);
  assert.deepEqual(delta.movedNodeIds, ["node-llms"]);
  assert.deepEqual(delta.addedRelationIds, ["relation-llm-vector"]);
  assert.equal(delta.summaryChanged, true);
});

test("predictions remain traceable to valid graph nodes and discoveries", () => {
  const predictions = derivePredictions(graph, research, profile);
  const focus = predictions.find((item) => item.id === "prediction-focus-ai");
  const gap = predictions.find((item) => item.id === "prediction-gap-ai");

  assert.deepEqual(focus?.nodeIds, ["node-ai"]);
  assert.deepEqual(focus?.discoveryIds.sort(), ["discovery-llm", "discovery-vector"]);
  assert.equal(gap?.kind, "project-gap");
  assert.ok(predictions.every((item) => item.confidence >= 0 && item.confidence <= 1));
});

test("recommendations separate research evidence from similar library discoveries", () => {
  const recommendations = deriveRecommendations(graph, research);
  const literature = recommendations.find((item) => item.id === "recommendation-source-research-paper");
  const similar = recommendations.find((item) => item.id === "recommendation-similar-node-ai");

  assert.equal(literature?.kind, "literature");
  assert.equal(literature?.researchCandidateId, "research-paper");
  assert.deepEqual(literature?.discoveryIds, ["discovery-vector"]);
  assert.equal(similar?.kind, "similar-discovery");
  assert.equal(similar?.discoveryIds.length, 2);
});

function node(
  id: string,
  parentId: string | null,
  discoveryIds: string[],
): KnowledgeGraph["nodes"][number] {
  return {
    id,
    title: id,
    kind: parentId ? "topic" : "domain",
    description: id,
    parentId,
    childIds: [],
    discoveryIds,
    aliases: [],
    keywords: [],
    confidence: 0.9,
  };
}
