import { promises as fs } from "node:fs";
import path from "node:path";

import type { KnowledgeGraphNodeKind } from "@savewise/shared";

export type KnowledgeNodeReference = {
  id: string;
  title: string;
  kind: KnowledgeGraphNodeKind;
  discoveryIds: string[];
};

export type KnowledgeGraphNodeOverride = {
  node: KnowledgeNodeReference;
  title: string;
  parent: KnowledgeNodeReference | null;
  updatedAt: string;
};

const OVERRIDES_FILE = path.resolve(
  process.cwd(),
  "data",
  "knowledge-graph-overrides.json",
);

export async function loadKnowledgeGraphOverrides(): Promise<KnowledgeGraphNodeOverride[]> {
  try {
    const content = await fs.readFile(OVERRIDES_FILE, "utf8");
    const parsed: unknown = JSON.parse(content);
    return Array.isArray(parsed)
      ? parsed.filter(isKnowledgeGraphNodeOverride)
      : [];
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return [];
    throw error;
  }
}

export async function saveKnowledgeGraphOverride(
  override: KnowledgeGraphNodeOverride,
): Promise<void> {
  const overrides = await loadKnowledgeGraphOverrides();
  const nextOverrides = [
    ...overrides.filter((candidate) => candidate.node.id !== override.node.id),
    override,
  ];

  await fs.mkdir(path.dirname(OVERRIDES_FILE), { recursive: true });
  const temporaryFile = `${OVERRIDES_FILE}.tmp`;
  await fs.writeFile(
    temporaryFile,
    `${JSON.stringify(nextOverrides, null, 2)}\n`,
    "utf8",
  );
  await fs.rename(temporaryFile, OVERRIDES_FILE);
}

function isKnowledgeGraphNodeOverride(
  value: unknown,
): value is KnowledgeGraphNodeOverride {
  if (!value || typeof value !== "object") return false;
  const override = value as Partial<KnowledgeGraphNodeOverride>;
  return isNodeReference(override.node) &&
    typeof override.title === "string" &&
    (override.parent === null || isNodeReference(override.parent)) &&
    typeof override.updatedAt === "string";
}

function isNodeReference(value: unknown): value is KnowledgeNodeReference {
  if (!value || typeof value !== "object") return false;
  const reference = value as Partial<KnowledgeNodeReference>;
  return typeof reference.id === "string" &&
    typeof reference.title === "string" &&
    typeof reference.kind === "string" &&
    Array.isArray(reference.discoveryIds);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
