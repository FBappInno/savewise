import { promises as fs } from "node:fs";
import path from "node:path";

import type {
  KnowledgeGraph,
} from "@savewise/shared";

const DATA_DIRECTORY = path.resolve(
  process.cwd(),
  "data",
);

const KNOWLEDGE_GRAPH_FILE = path.join(
  DATA_DIRECTORY,
  "knowledge-graph.json",
);

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
    typeof graph.generatedAt === "string" &&
    typeof graph.sourceFingerprint ===
      "string" &&
    typeof graph.language === "string" &&
    typeof graph.summary === "string" &&
    Array.isArray(graph.rootNodeIds) &&
    Array.isArray(graph.nodes) &&
    Array.isArray(graph.relations)
  );
}

async function ensureDataDirectory(): Promise<void> {
  await fs.mkdir(DATA_DIRECTORY, {
    recursive: true,
  });
}

export async function loadKnowledgeGraph(): Promise<
  KnowledgeGraph | null
> {
  await ensureDataDirectory();

  try {
    const fileContent =
      await fs.readFile(
        KNOWLEDGE_GRAPH_FILE,
        "utf8",
      );

    if (!fileContent.trim()) {
      return null;
    }

    const parsedValue: unknown =
      JSON.parse(fileContent);

    return isKnowledgeGraph(
      parsedValue,
    )
      ? parsedValue
      : null;
  } catch (error) {
    if (
      isNodeError(error) &&
      error.code === "ENOENT"
    ) {
      return null;
    }

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
  await ensureDataDirectory();

  const temporaryFile =
    `${KNOWLEDGE_GRAPH_FILE}.tmp`;

  try {
    await fs.writeFile(
      temporaryFile,
      `${JSON.stringify(
        graph,
        null,
        2,
      )}\n`,
      "utf8",
    );

    await fs.rename(
      temporaryFile,
      KNOWLEDGE_GRAPH_FILE,
    );
  } catch (error) {
    try {
      await fs.rm(
        temporaryFile,
        {
          force: true,
        },
      );
    } catch {
      // Hauptfehler beibehalten.
    }

    throw error;
  }
}

export async function deleteKnowledgeGraph(): Promise<void> {
  try {
    await fs.rm(
      KNOWLEDGE_GRAPH_FILE,
      {
        force: true,
      },
    );
  } catch (error) {
    console.error(
      "Failed to delete knowledge graph:",
      error,
    );
  }
}

function isNodeError(
  error: unknown,
): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error
  );
}