import { createHash } from "node:crypto";

import type {
  Discovery,
  KnowledgeGraph,
} from "@savewise/shared";

import {
  loadKnowledgeGraph,
  saveKnowledgeGraph,
} from "../../persistence/knowledge/knowledge-graph-store";
import { buildKnowledgeGraphWithAI } from "../ai/openai-knowledge-architect";

export type KnowledgeGraphBuildOptions = {
  forceRebuild?: boolean;
};

export async function getOrBuildKnowledgeGraph(
  discoveries: Discovery[],
  options: KnowledgeGraphBuildOptions = {},
): Promise<KnowledgeGraph | null> {
  const sourceFingerprint =
    createDiscoveryFingerprint(
      discoveries,
    );

  const storedGraph =
    await loadKnowledgeGraph();

  if (
    !options.forceRebuild &&
    storedGraph &&
    storedGraph.sourceFingerprint ===
      sourceFingerprint
  ) {
    return storedGraph;
  }

  try {
    const graph =
      await buildKnowledgeGraphWithAI(
        discoveries,
        sourceFingerprint,
      );

    await saveKnowledgeGraph(graph);

    return graph;
  } catch (error) {
    console.error(
      "AI knowledge graph build failed:",
      error,
    );

    if (storedGraph) {
      console.warn(
        "Using the previously stored knowledge graph.",
      );

      return storedGraph;
    }

    return null;
  }
}

export async function rebuildKnowledgeGraph(
  discoveries: Discovery[],
): Promise<KnowledgeGraph | null> {
  return getOrBuildKnowledgeGraph(
    discoveries,
    {
      forceRebuild: true,
    },
  );
}

function createDiscoveryFingerprint(
  discoveries: Discovery[],
): string {
  const normalizedDiscoveries =
    [...discoveries]
      .sort((first, second) =>
        first.id.localeCompare(
          second.id,
        ),
      )
      .map((discovery) => ({
        id: discovery.id,

        title:
          discovery.improvedTitle ||
          discovery.title,

        summary:
          discovery.summary ?? "",

        classification:
          discovery.classification ??
          null,

        topics:
          [...discovery.topics].sort(),

        keywords:
          [...discovery.keywords].sort(),

        createdAt:
          discovery.createdAt,

        updatedAt:
          discovery.updatedAt,
      }));

  return createHash("sha256")
    .update(
      JSON.stringify(
        normalizedDiscoveries,
      ),
    )
    .digest("hex");
}