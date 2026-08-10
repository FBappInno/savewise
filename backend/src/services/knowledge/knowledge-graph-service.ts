import { createHash } from "node:crypto";

import type {
  Discovery,
  KnowledgeGraph,
} from "@savewise/shared";

import {
  loadKnowledgeGraph,
  saveKnowledgeGraph,
} from "../../persistence/knowledge/knowledge-graph-store";
import {
  buildDeterministicKnowledgeGraph,
} from "../ai/openai-knowledge-architect";

const KNOWLEDGE_ARCHITECTURE_VERSION =
  "classification-taxonomy-v1";

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
    storedGraph?.sourceFingerprint ===
      sourceFingerprint
  ) {
    return storedGraph;
  }

  /*
   * The persisted Discovery classifications are the only structural
   * input. A previous graph and structural overrides must never affect
   * a new taxonomy build.
   */
  const graph =
    buildDeterministicKnowledgeGraph(
      discoveries,
      sourceFingerprint,
    );

  /*
   * The builder validates before returning. Persist exactly that graph
   * so the stored and delivered structures are identical.
   */
  await saveKnowledgeGraph(graph);

  return graph;
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
      JSON.stringify({
        architectureVersion:
          KNOWLEDGE_ARCHITECTURE_VERSION,
        discoveries:
          normalizedDiscoveries,
      }),
    )
    .digest("hex");
}
