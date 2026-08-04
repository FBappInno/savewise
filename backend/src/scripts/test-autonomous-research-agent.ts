import assert from "node:assert/strict";
import test from "node:test";

import type {
  KnowledgeGraph,
  ResearchCandidate,
  ResearchInterest,
} from "@savewise/shared";

import {
  deriveGroundedInterests,
  enrichInterestTrends,
} from "../services/ai/openai-research-agent";
import {
  createResearchRunArtifacts,
  isResearchDue,
} from "../services/research/research-service";

const now = new Date("2026-08-03T08:00:00.000Z");

function interest(overrides: Partial<ResearchInterest> = {}): ResearchInterest {
  return {
    id: "llms",
    title: "LLMs",
    description: "Gespeichertes Wissen über Sprachmodelle.",
    nodeIds: ["node-llms"],
    discoveryCount: 5,
    strength: 0.8,
    previousStrength: null,
    trend: "new",
    trendExplanation: "",
    firstDetectedAt: now.toISOString(),
    observedRuns: 1,
    knowledgeGaps: ["Vector Databases"],
    ...overrides,
  };
}

function candidate(overrides: Partial<ResearchCandidate> = {}): ResearchCandidate {
  return {
    id: "research-vector",
    title: "Vector Databases for Retrieval",
    url: "https://example.org/vector-databases",
    sourceName: "Example University",
    sourceType: "paper",
    publishedAt: "2026-07-20",
    summary: "A grounded comparison of vector database retrieval methods.",
    interestId: "llms",
    scores: {
      relevance: 0.94,
      quality: 0.9,
      recency: 0.95,
      trustworthiness: 0.92,
      knowledgeValue: 0.93,
      gapCoverage: 0.98,
      overall: 0.94,
    },
    relevance: "relevant",
    decisionReason: "Closes a detected knowledge gap.",
    impact: "contradicts",
    impactExplanation: "Challenges an existing assumption about retrieval quality.",
    relatedDiscoveryIds: ["discovery-llm"],
    status: "suggested",
    foundAt: now.toISOString(),
    ...overrides,
  };
}

test("interest trends are derived from prior autonomous observations", () => {
  const previous = interest({ strength: 0.55, observedRuns: 2 });
  const [rising] = enrichInterestTrends(
    [interest({ strength: 0.8 })],
    [previous],
    "de",
    now,
  );

  assert.equal(rising?.trend, "rising");
  assert.equal(rising?.previousStrength, 0.55);
  assert.equal(rising?.observedRuns, 3);
  assert.match(rising?.trendExplanation ?? "", /gestiegen/);

  const [longTerm] = enrichInterestTrends(
    [interest({ strength: 0.56 })],
    [previous],
    "de",
    now,
  );
  assert.equal(longTerm?.trend, "long-term");
});

test("daily briefing reports qualified sources, gaps, trends and discarded results", () => {
  const relevant = candidate();
  const partial = candidate({
    id: "research-video",
    url: "https://example.org/video",
    sourceType: "video",
    relevance: "partially-relevant",
    impact: "confirms",
  });
  const artifacts = createResearchRunArtifacts(
    [interest({ trend: "rising", trendExplanation: "Steigend." })],
    [relevant, partial],
    4,
    "de",
    now,
  );

  assert.equal(artifacts.briefing.counts.totalFound, 2);
  assert.equal(artifacts.briefing.counts.papers, 1);
  assert.equal(artifacts.briefing.counts.videos, 1);
  assert.equal(artifacts.briefing.counts.discarded, 4);
  assert.equal(artifacts.briefing.counts.knowledgeGaps, 1);
  assert.ok(artifacts.insights.some((item) => item.kind === "contradiction"));
  assert.ok(artifacts.insights.some((item) => item.kind === "confirmation"));
  assert.ok(artifacts.insights.some((item) => item.kind === "knowledge-gap"));
});

test("continuous research runs only when the persisted schedule is due", () => {
  assert.equal(isResearchDue({ nextRecommendedRunAt: null }, now), true);
  assert.equal(
    isResearchDue({ nextRecommendedRunAt: "2026-08-03T07:59:00.000Z" }, now),
    true,
  );
  assert.equal(
    isResearchDue({ nextRecommendedRunAt: "2026-08-03T09:00:00.000Z" }, now),
    false,
  );
});

test("AI outage fallback retains only interests grounded in the current graph", () => {
  const graph: KnowledgeGraph = {
    generatedAt: now.toISOString(),
    sourceFingerprint: "test",
    language: "de",
    summary: "Test graph",
    rootNodeIds: ["node-llms"],
    nodes: [{
      id: "node-llms",
      title: "LLMs",
      kind: "domain",
      description: "Sprachmodelle",
      parentId: null,
      childIds: [],
      discoveryIds: ["discovery-llm"],
      aliases: [],
      keywords: ["LLM"],
      confidence: 0.9,
    }],
    relations: [],
  };
  const grounded = deriveGroundedInterests([
    interest(),
    interest({ id: "invented", nodeIds: ["missing-node"] }),
  ], graph);

  assert.ok(grounded.some((item) => item.id === "llms"));
  assert.ok(grounded.every((item) => item.nodeIds.includes("node-llms")));
  assert.ok(!grounded.some((item) => item.id === "invented"));
});
