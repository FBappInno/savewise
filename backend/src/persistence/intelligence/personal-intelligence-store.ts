import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import type {
  IntelligenceLearningEvent,
  KnowledgeGraph,
} from "@savewise/shared";

export interface IntelligenceGraphSnapshot {
  fingerprint: string;
  summary: string;
  nodes: Array<{ id: string; parentId: string | null }>;
  relations: Array<{ id: string }>;
}

export interface PersonalIntelligenceState {
  modelVersion: number;
  events: IntelligenceLearningEvent[];
  graphSnapshot: IntelligenceGraphSnapshot | null;
}

const STATE_FILE = path.resolve(
  process.cwd(),
  "data",
  "personal-intelligence-state.json",
);

const EMPTY_STATE: PersonalIntelligenceState = {
  modelVersion: 0,
  events: [],
  graphSnapshot: null,
};

export async function loadPersonalIntelligenceState(): Promise<PersonalIntelligenceState> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
    return isState(parsed) ? parsed : structuredClone(EMPTY_STATE);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return structuredClone(EMPTY_STATE);
    }
    throw error;
  }
}

export async function savePersonalIntelligenceState(
  state: PersonalIntelligenceState,
): Promise<void> {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
  const temporaryFile = `${STATE_FILE}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await fs.rename(temporaryFile, STATE_FILE);
}

export function createGraphSnapshot(graph: KnowledgeGraph): IntelligenceGraphSnapshot {
  const structure = {
    sourceFingerprint: graph.sourceFingerprint,
    summary: graph.summary,
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      parentId: node.parentId,
      discoveryIds: [...node.discoveryIds].sort(),
      aliases: [...node.aliases].sort(),
    })).sort((first, second) => first.id.localeCompare(second.id)),
    relations: graph.relations.map((relation) => ({
      id: relation.id,
      strength: relation.strength,
      kind: relation.kind,
    })).sort((first, second) => first.id.localeCompare(second.id)),
  };
  return {
    fingerprint: createHash("sha256")
      .update(JSON.stringify(structure))
      .digest("hex"),
    summary: graph.summary,
    nodes: graph.nodes.map((node) => ({ id: node.id, parentId: node.parentId })),
    relations: graph.relations.map((relation) => ({ id: relation.id })),
  };
}

function isState(value: unknown): value is PersonalIntelligenceState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<PersonalIntelligenceState>;
  return Number.isInteger(state.modelVersion) &&
    Array.isArray(state.events) &&
    (state.graphSnapshot === null || typeof state.graphSnapshot === "object");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
