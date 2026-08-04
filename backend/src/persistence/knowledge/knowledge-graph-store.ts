import type {
  KnowledgeGraph,
} from "@savewise/shared";

import { storagePaths } from "../../config/storage-paths";
import {
  deleteJsonFile,
  readJsonFile,
  writeJsonFile,
} from "../shared/json-file-store";

export async function loadKnowledgeGraph(): Promise<
  KnowledgeGraph | null
> {
  try {
    return await readJsonFile(
      storagePaths.knowledgeGraph,
      () => null,
      isKnowledgeGraphOrNull,
    );
  } catch (error) {
    console.error(
      "Failed to load knowledge graph:",
      error,
    );

    return null;
  }
}

export async function saveKnowledgeGraph(
  graph: KnowledgeGraph,
): Promise<void> {
  await writeJsonFile(
    storagePaths.knowledgeGraph,
    graph,
  );
}

export async function deleteKnowledgeGraph(): Promise<void> {
  try {
    await deleteJsonFile(
      storagePaths.knowledgeGraph,
    );
  } catch (error) {
    console.error(
      "Failed to delete knowledge graph:",
      error,
    );
  }
}

function isKnowledgeGraphOrNull(
  value: unknown,
): value is KnowledgeGraph | null {
  return (
    value === null ||
    isKnowledgeGraph(value)
  );
}

function isKnowledgeGraph(
  value: unknown,
): value is KnowledgeGraph {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return false;
  }

  const graph =
    value as Partial<KnowledgeGraph>;

  return (
    typeof graph.generatedAt ===
      "string" &&
    typeof graph.sourceFingerprint ===
      "string" &&
    typeof graph.language ===
      "string" &&
    typeof graph.summary ===
      "string" &&
    Array.isArray(
      graph.rootNodeIds,
    ) &&
    Array.isArray(
      graph.nodes,
    ) &&
    Array.isArray(
      graph.relations,
    )
  );
}