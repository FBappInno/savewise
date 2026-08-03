import assert from "node:assert/strict";
import test from "node:test";

import type { Discovery, KnowledgeGraph } from "@savewise/shared";

import { createGroundedOverview } from "../services/ai/openai-second-brain";

const discovery: Discovery = {
  id: "protein-1",
  source: "web",
  url: "https://nutrition.example/protein",
  title: "Protein",
  improvedTitle: "Protein im Alltag",
  summary: "Gespeichertes Wissen zu Protein im Alltag.",
  classification: {
    primaryCategory: "health",
    secondaryCategory: "Ernährung",
    topic: "Protein",
    subtopics: [],
  },
  keywords: ["Protein", "Ernährung"],
  language: "de",
  confidence: 0.8,
  topics: ["Protein"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  savedAtLabel: "Heute",
};

const graph: KnowledgeGraph = {
  generatedAt: new Date().toISOString(),
  sourceFingerprint: "test",
  language: "de",
  summary: "Persönliches Wissen über Ernährung.",
  rootNodeIds: ["nutrition"],
  nodes: [{
    id: "nutrition",
    title: "Ernährung",
    kind: "domain",
    description: "Ernährung",
    parentId: null,
    childIds: ["protein"],
    discoveryIds: ["protein-1"],
    aliases: [],
    keywords: ["Ernährung"],
    confidence: 0.8,
  }, {
    id: "protein",
    title: "Protein",
    kind: "topic",
    description: "Protein im Alltag",
    parentId: "nutrition",
    childIds: [],
    discoveryIds: ["protein-1"],
    aliases: ["Eiweiß"],
    keywords: ["Protein"],
    confidence: 0.8,
  }],
  relations: [],
};

test("builds a bounded quality assessment from personal evidence only", () => {
  const overview = createGroundedOverview([discovery], graph);
  assert.equal(overview.profile.interests[0], "Ernährung");
  assert.deepEqual(overview.gaps[0]?.relatedNodeIds, ["protein"]);
  assert.ok(overview.quality.overallScore >= 0 && overview.quality.overallScore <= 1);
  assert.match(overview.quality.sourceDiversity.summary, /Quellentyp/);
});

test("preserves explicit long-term profile fields in a fallback", () => {
  const overview = createGroundedOverview([discovery], graph, {
    interests: [],
    projects: ["Ernährungsprojekt"],
    learningGoals: ["Protein verstehen"],
    frequentQuestions: ["Was weiß ich über Protein?"],
    developmentSummary: "",
    updatedAt: new Date().toISOString(),
  });
  assert.deepEqual(overview.profile.projects, ["Ernährungsprojekt"]);
  assert.deepEqual(overview.profile.learningGoals, ["Protein verstehen"]);
  assert.deepEqual(overview.profile.frequentQuestions, ["Was weiß ich über Protein?"]);
});
