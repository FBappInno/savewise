import assert from "node:assert/strict";
import test from "node:test";

import type { KnowledgeGraph } from "@savewise/shared";

import type { KnowledgeGraphNodeOverride } from "../persistence/knowledge/knowledge-graph-override-store";
import { applyOverridesToGraph } from "../services/knowledge/knowledge-graph-overrides";

const graph: KnowledgeGraph = {
  generatedAt: "2026-08-03T00:00:00.000Z",
  sourceFingerprint: "test",
  language: "de",
  summary: "Test graph",
  rootNodeIds: ["node-health", "node-finance"],
  nodes: [
    createNode("node-health", "Gesundheit", null, ["node-sport"], ["d1"]),
    createNode("node-sport", "Sport", "node-health", [], ["d1"]),
    createNode("node-finance", "Finanzen", null, [], ["d2"]),
  ],
  relations: [],
};

test("keeps a manual topic rename and parent assignment", () => {
  const override: KnowledgeGraphNodeOverride = {
    node: { id: "node-sport", title: "Sport", kind: "topic", discoveryIds: ["d1"] },
    title: "Bewegung",
    parent: { id: "node-finance", title: "Finanzen", kind: "domain", discoveryIds: ["d2"] },
    updatedAt: "2026-08-03T00:00:00.000Z",
  };

  const updated = applyOverridesToGraph(graph, [override]);
  const topic = updated.nodes.find((node) => node.id === "node-sport");
  const oldParent = updated.nodes.find((node) => node.id === "node-health");
  const newParent = updated.nodes.find((node) => node.id === "node-finance");

  assert.equal(topic?.title, "Bewegung");
  assert.equal(topic?.parentId, "node-finance");
  assert.deepEqual(oldParent?.childIds, []);
  assert.deepEqual(newParent?.childIds, ["node-sport"]);
});

test("matches an AI-renamed node again through its discovery IDs", () => {
  const override: KnowledgeGraphNodeOverride = {
    node: { id: "old-sport-id", title: "Sport", kind: "topic", discoveryIds: ["d1"] },
    title: "Training",
    parent: null,
    updatedAt: "2026-08-03T00:00:00.000Z",
  };

  const updated = applyOverridesToGraph(graph, [override]);
  const topic = updated.nodes.find((node) => node.id === "node-sport");
  assert.equal(topic?.title, "Training");
  assert.equal(topic?.parentId, null);
  assert.ok(updated.rootNodeIds.includes("node-sport"));
});

function createNode(
  id: string,
  title: string,
  parentId: string | null,
  childIds: string[],
  discoveryIds: string[],
): KnowledgeGraph["nodes"][number] {
  return {
    id,
    title,
    kind: id === "node-sport" ? "topic" : "domain",
    description: title,
    parentId,
    childIds,
    discoveryIds,
    aliases: [],
    keywords: [],
    confidence: 1,
  };
}
