import assert from "node:assert/strict";
import test from "node:test";

import type {
  Discovery,
  KnowledgeGraphNode,
} from "@savewise/shared";

import {
  buildDeterministicKnowledgeGraph,
} from "../services/ai/openai-knowledge-architect";

const discoveries: Discovery[] = [
  createDiscovery(
    "d1",
    "Military Technology",
    "Ballistischer Schutz",
    ["Schutzhelme", "Visiere", "Nackenschutz"],
    "culture",
  ),
  createDiscovery(
    "d2",
    " military technology ",
    "Panzertechnik",
    ["Kampfpanzer", "Schutzsysteme"],
    "finance",
  ),
  createDiscovery(
    "d3",
    "Military Technology",
    "Ballistischer Schutz",
    [],
    "lifestyle",
  ),
];

test("builds the complete visible taxonomy deterministically", () => {
  const graph =
    buildDeterministicKnowledgeGraph(
      discoveries,
      "smoke-test",
    );

  assert.equal(
    graph.rootNodeIds.length,
    1,
    "normalized galaxy variants must share one domain",
  );

  const nodesById =
    new Map(
      graph.nodes.map((node) => [
        node.id,
        node,
      ]),
    );

  const domain =
    nodesById.get(
      graph.rootNodeIds[0],
    );

  assert.ok(domain);
  assert.equal(
    domain.id,
    "node-domain-military-technology",
  );
  assert.ok(
    !graph.nodes.some((node) =>
      /culture|finance|lifestyle/.test(
        node.id,
      ),
    ),
    "primaryCategory must not affect visible node IDs",
  );

  const topics = childrenOf(
    domain,
    nodesById,
  );

  assert.deepEqual(
    topics.map((node) => node.title).sort(),
    ["Ballistischer Schutz", "Panzertechnik"],
  );

  const protectionTopic = topics.find(
    (node) =>
      node.title ===
      "Ballistischer Schutz",
  );

  assert.ok(protectionTopic);

  const stars = childrenOf(
    protectionTopic,
    nodesById,
  );

  assert.deepEqual(
    stars.map((node) => node.title).sort(),
    ["Nackenschutz", "Schutzhelme", "Visiere"],
    "subtopics must be sibling stars",
  );

  assert.ok(
    protectionTopic.discoveryIds.includes(
      "d3",
    ),
    "a discovery without subtopics must be assigned to its topic",
  );

  assert.ok(
    stars.every((star) =>
      star.discoveryIds.includes("d1"),
    ),
    "a discovery must be assigned to every listed subtopic",
  );

  const reachableDiscoveryIds =
    collectDiscoveryIds(
      domain,
      nodesById,
    );

  assert.deepEqual(
    [...reachableDiscoveryIds].sort(),
    ["d1", "d2", "d3"],
    "every discovery must be reachable from its domain",
  );

  assert.ok(
    graph.nodes.every((node) =>
      !node.id.includes(
        "old-ai-key",
      ),
    ),
    "no previous AI node ID may survive",
  );
});

function createDiscovery(
  id: string,
  secondaryCategory: string,
  topic: string,
  subtopics: string[],
  primaryCategory:
    NonNullable<Discovery["classification"]>["primaryCategory"],
): Discovery {
  return {
    id,
    workspaceId: "private",
    source: "web",
    title: id,
    classification: {
      primaryCategory,
      secondaryCategory,
      topic,
      subtopics,
    },
    keywords: [],
    topics: [],
    createdAt:
      "2026-08-10T00:00:00.000Z",
    updatedAt:
      "2026-08-10T00:00:00.000Z",
    savedAtLabel:
      "10.8.2026",
  };
}

function childrenOf(
  node: KnowledgeGraphNode,
  nodesById: Map<string, KnowledgeGraphNode>,
): KnowledgeGraphNode[] {
  return node.childIds.map((id) => {
    const child = nodesById.get(id);
    assert.ok(child);
    return child;
  });
}

function collectDiscoveryIds(
  node: KnowledgeGraphNode,
  nodesById: Map<string, KnowledgeGraphNode>,
): Set<string> {
  const result =
    new Set(node.discoveryIds);

  for (const child of childrenOf(
    node,
    nodesById,
  )) {
    for (const discoveryId of collectDiscoveryIds(
      child,
      nodesById,
    )) {
      result.add(discoveryId);
    }
  }

  return result;
}
