import {
  createHash,
} from "node:crypto";

import type {
  IntelligenceLearningEvent,
  KnowledgeGraph,
} from "@savewise/shared";

import { storagePaths } from "../../config/storage-paths";
import {
  readJsonFile,
  writeJsonFile,
} from "../shared/json-file-store";

export interface IntelligenceGraphSnapshot {
  fingerprint: string;

  summary: string;

  nodes: Array<{
    id: string;
    parentId:
      | string
      | null;
  }>;

  relations: Array<{
    id: string;
  }>;
}

export interface PersonalIntelligenceState {
  modelVersion: number;

  events:
    IntelligenceLearningEvent[];

  graphSnapshot:
    | IntelligenceGraphSnapshot
    | null;
}

const EMPTY_STATE: PersonalIntelligenceState = {
  modelVersion: 0,

  events: [],

  graphSnapshot: null,
};

export async function loadPersonalIntelligenceState(): Promise<PersonalIntelligenceState> {
  return readJsonFile(
    storagePaths
      .personalIntelligenceState,
    createEmptyState,
    isState,
  );
}

export async function savePersonalIntelligenceState(
  state: PersonalIntelligenceState,
): Promise<void> {
  await writeJsonFile(
    storagePaths
      .personalIntelligenceState,
    state,
  );
}

export function createGraphSnapshot(
  graph: KnowledgeGraph,
): IntelligenceGraphSnapshot {
  const structure = {
    sourceFingerprint:
      graph.sourceFingerprint,

    summary:
      graph.summary,

    nodes:
      graph.nodes
        .map(
          (node) => ({
            id:
              node.id,

            title:
              node.title,

            parentId:
              node.parentId,

            discoveryIds: [
              ...node.discoveryIds,
            ].sort(),

            aliases: [
              ...node.aliases,
            ].sort(),
          }),
        )
        .sort(
          (first, second) =>
            first.id.localeCompare(
              second.id,
            ),
        ),

    relations:
      graph.relations
        .map(
          (relation) => ({
            id:
              relation.id,

            strength:
              relation.strength,

            kind:
              relation.kind,
          }),
        )
        .sort(
          (first, second) =>
            first.id.localeCompare(
              second.id,
            ),
        ),
  };

  return {
    fingerprint:
      createHash("sha256")
        .update(
          JSON.stringify(
            structure,
          ),
        )
        .digest("hex"),

    summary:
      graph.summary,

    nodes:
      graph.nodes.map(
        (node) => ({
          id:
            node.id,

          parentId:
            node.parentId,
        }),
      ),

    relations:
      graph.relations.map(
        (relation) => ({
          id:
            relation.id,
        }),
      ),
  };
}

function createEmptyState(): PersonalIntelligenceState {
  return structuredClone(
    EMPTY_STATE,
  );
}

function isState(
  value: unknown,
): value is PersonalIntelligenceState {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const state =
    value as Partial<PersonalIntelligenceState>;

  return (
    Number.isInteger(
      state.modelVersion,
    ) &&
    Array.isArray(
      state.events,
    ) &&
    (
      state.graphSnapshot ===
        null ||
      typeof state.graphSnapshot ===
        "object"
    )
  );
}