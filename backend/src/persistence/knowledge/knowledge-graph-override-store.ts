import type {
  KnowledgeGraphNodeKind,
} from "@savewise/shared";

import { storagePaths } from "../../config/storage-paths";
import {
  readJsonFile,
  writeJsonFile,
} from "../shared/json-file-store";

export type KnowledgeNodeReference = {
  id: string;
  title: string;
  kind: KnowledgeGraphNodeKind;
  discoveryIds: string[];
};

export type KnowledgeGraphNodeOverride = {
  node: KnowledgeNodeReference;
  title: string;
  parent:
    | KnowledgeNodeReference
    | null;
  updatedAt: string;
};

export async function loadKnowledgeGraphOverrides(): Promise<
  KnowledgeGraphNodeOverride[]
> {
  return readJsonFile(
    storagePaths
      .knowledgeGraphOverrides,
    () => [],
    isOverrideArray,
  );
}

export async function saveKnowledgeGraphOverride(
  override: KnowledgeGraphNodeOverride,
): Promise<void> {
  const overrides =
    await loadKnowledgeGraphOverrides();

  const nextOverrides = [
    ...overrides.filter(
      (candidate) =>
        candidate.node.id !==
        override.node.id,
    ),

    override,
  ];

  await writeJsonFile(
    storagePaths
      .knowledgeGraphOverrides,
    nextOverrides,
  );
}

function isOverrideArray(
  value: unknown,
): value is KnowledgeGraphNodeOverride[] {
  return (
    Array.isArray(value) &&
    value.every(
      isKnowledgeGraphNodeOverride,
    )
  );
}

function isKnowledgeGraphNodeOverride(
  value: unknown,
): value is KnowledgeGraphNodeOverride {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const override =
    value as Partial<KnowledgeGraphNodeOverride>;

  return (
    isNodeReference(
      override.node,
    ) &&
    typeof override.title ===
      "string" &&
    (
      override.parent === null ||
      isNodeReference(
        override.parent,
      )
    ) &&
    typeof override.updatedAt ===
      "string"
  );
}

function isNodeReference(
  value: unknown,
): value is KnowledgeNodeReference {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const reference =
    value as Partial<KnowledgeNodeReference>;

  return (
    typeof reference.id ===
      "string" &&
    typeof reference.title ===
      "string" &&
    typeof reference.kind ===
      "string" &&
    Array.isArray(
      reference.discoveryIds,
    )
  );
}