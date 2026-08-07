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
import { applyKnowledgeGraphOverrides } from "./knowledge-graph-overrides";

const KNOWLEDGE_ARCHITECTURE_VERSION = "hierarchical-universe-v5-clustered";

export type KnowledgeGraphBuildOptions = {
  forceRebuild?: boolean;
};

let backgroundRebuild:
  Promise<void> | null = null;

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
    return normalizeKnowledgeHierarchy(
      await applyKnowledgeGraphOverrides(storedGraph),
      discoveries,
    );
  }

  if (!options.forceRebuild) {
    const immediateGraph =
      buildImmediateKnowledgeGraph(
        storedGraph,
        discoveries,
        sourceFingerprint,
      );

    scheduleBackgroundRebuild(
      discoveries,
      sourceFingerprint,
      immediateGraph,
    );

    return normalizeKnowledgeHierarchy(immediateGraph, discoveries);
  }

  try {
    const generatedGraph =
      await buildKnowledgeGraphWithAI(
        discoveries,
        sourceFingerprint,
        storedGraph,
      );

    const graph = await applyKnowledgeGraphOverrides(generatedGraph);
    await saveKnowledgeGraph(graph);

    return normalizeKnowledgeHierarchy(graph, discoveries);
  } catch (error) {
    console.error(
      "AI knowledge graph build failed:",
      error,
    );

    if (storedGraph) {
      console.warn(
        "Using the previously stored knowledge graph.",
      );

      return normalizeKnowledgeHierarchy(
        await applyKnowledgeGraphOverrides(storedGraph),
        discoveries,
      );
    }

    return null;
  }
}

function normalizeKnowledgeHierarchy(
  graph: KnowledgeGraph,
  discoveries: Discovery[],
): KnowledgeGraph {
  const nodes =
    graph.nodes.map((node) => ({
      ...node,
      childIds: [],
      discoveryIds: [
        ...node.discoveryIds,
      ],
      aliases: [
        ...node.aliases,
      ],
      keywords: [
        ...node.keywords,
      ],
    }));

  const nodeMap =
    new Map(
      nodes.map((node) => [
        node.id,
        node,
      ]),
    );

  for (const node of nodes) {
    if (
      node.parentId &&
      !nodeMap.has(node.parentId)
    ) {
      node.parentId = null;
    }
  }

  const depthCache =
    new Map<string, number>();

  function getDepth(
    node: KnowledgeGraph["nodes"][number],
    visited = new Set<string>(),
  ): number {
    const cached =
      depthCache.get(node.id);

    if (
      cached !== undefined
    ) {
      return cached;
    }

    if (
      !node.parentId ||
      visited.has(node.id)
    ) {
      depthCache.set(
        node.id,
        0,
      );

      return 0;
    }

    const parent =
      nodeMap.get(
        node.parentId,
      );

    if (!parent) {
      node.parentId = null;

      depthCache.set(
        node.id,
        0,
      );

      return 0;
    }

    const nextVisited =
      new Set(visited);

    nextVisited.add(node.id);

    const depth =
      Math.min(
        2,
        getDepth(
          parent,
          nextVisited,
        ) + 1,
      );

    depthCache.set(
      node.id,
      depth,
    );

    return depth;
  }

  for (const node of nodes) {
    const depth =
      getDepth(node);

    node.kind =
      depth === 0
        ? "domain"
        : depth === 1
          ? "topic"
          : "subtopic";

    node.title =
      formatLabel(
        node.title,
      );
  }

  const genericRootIds =
    new Set(
      nodes
        .filter(
          (node) =>
            node.parentId === null &&
            isGenericDomainLabel(
              node.title,
            ),
        )
        .map(
          (node) =>
            node.id,
        ),
    );

  for (const node of nodes) {
    if (
      node.parentId &&
      genericRootIds.has(
        node.parentId,
      )
    ) {
      node.parentId = null;
      node.kind = "domain";
    }
  }

  const normalizedNodes =
    nodes.filter(
      (node) =>
        !genericRootIds.has(
          node.id,
        ),
    );

  rebuildHierarchyChildren(
    normalizedNodes,
  );

  const normalizedNodeIds =
    new Set(
      normalizedNodes.map(
        (node) =>
          node.id,
      ),
    );

  return {
    ...graph,

    rootNodeIds:
      normalizedNodes
        .filter(
          (node) =>
            node.parentId === null,
        )
        .map(
          (node) =>
            node.id,
        ),

    nodes:
      normalizedNodes,

    relations:
      graph.relations.filter(
        (relation) =>
          normalizedNodeIds.has(
            relation.sourceId,
          ) &&
          normalizedNodeIds.has(
            relation.targetId,
          ),
      ),
  };
}

function rebuildHierarchyChildren(nodes: KnowledgeGraph["nodes"]): void {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  nodes.forEach((node) => { node.childIds = []; });
  nodes.forEach((node) => {
    if (!node.parentId) return;
    const parent = nodeMap.get(node.parentId);
    if (!parent) node.parentId = null;
    else if (!parent.childIds.includes(node.id)) parent.childIds.push(node.id);
  });
}

function buildImmediateKnowledgeGraph(
  storedGraph: KnowledgeGraph | null,
  discoveries: Discovery[],
  sourceFingerprint: string,
): KnowledgeGraph {
  const validDiscoveryIds = new Set(
    discoveries.map((discovery) => discovery.id),
  );
  const nodes = (storedGraph?.nodes ?? []).map(
    (node) => ({
      ...node,
      childIds: [...node.childIds],
      discoveryIds: node.discoveryIds.filter((id) =>
        validDiscoveryIds.has(id),
      ),
      aliases: [...node.aliases],
      keywords: [...node.keywords],
    }),
  );
  const assignedDiscoveryIds = new Set(
    nodes.flatMap((node) => node.discoveryIds),
  );

  for (const discovery of discoveries) {
    if (assignedDiscoveryIds.has(discovery.id)) {
      continue;
    }

    addDiscoveryHierarchy(nodes, discovery);
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const rootNodeIds = nodes
    .filter((node) => !node.parentId || !nodeIds.has(node.parentId))
    .map((node) => node.id);

  return {
    generatedAt: new Date().toISOString(),
    sourceFingerprint,
    language:
      storedGraph?.language ||
      discoveries.find((discovery) => discovery.language)?.language ||
      "en",
    summary:
      storedGraph?.summary ||
      "Your knowledge tree is ready and will continue improving in the background.",
    rootNodeIds,
    nodes,
    relations: (storedGraph?.relations ?? []).filter(
      (relation) =>
        nodeIds.has(relation.sourceId) &&
        nodeIds.has(relation.targetId),
    ),
  };
}

function addDiscoveryHierarchy(
  nodes: KnowledgeGraph["nodes"],
  discovery: Discovery,
): void {
  const classification = discovery.classification;
  const rawLabels = [
    classification
      ? resolveDomainLabel(
          classification.primaryCategory,
          classification.secondaryCategory,
        )
      : undefined,

    classification?.topic,

    ...(classification?.subtopics ?? []),
  ].slice(0, 3);
  const labels = uniqueLabels(
    rawLabels.filter(
      (value): value is string => Boolean(value?.trim()),
    ),
  );

  if (labels.length === 0) {
    labels.push(
      ...uniqueLabels(discovery.topics),
    );
  }

  if (labels.length === 0) {
    labels.push(
      discovery.improvedTitle || discovery.title,
    );
  }

  let parentId: string | null = null;

  labels.forEach((rawLabel, index) => {
    const label = formatLabel(rawLabel);
    let node = nodes.find(
      (candidate) =>
        candidate.parentId === parentId &&
        matchesLabel(candidate, label),
    );

    if (!node) {
      const id = createProvisionalNodeId(
        parentId,
        label,
      );

      node = {
        id,
        title: label,
        kind: getNodeKind(index),
        description:
          index === labels.length - 1
            ? discovery.summary ||
              discovery.description ||
              `Knowledge about ${label}.`
            : `Knowledge about ${label}.`,
        parentId,
        childIds: [],
        discoveryIds: [],
        aliases: [],
        keywords:
          index === labels.length - 1
            ? [...discovery.keywords]
            : [],
        confidence:
          discovery.confidence ?? 0.5,
      };

      nodes.push(node);

      if (parentId) {
        const parent = nodes.find(
          (candidate) => candidate.id === parentId,
        );

        if (parent && !parent.childIds.includes(id)) {
          parent.childIds.push(id);
        }
      }
    }

    if (!node.discoveryIds.includes(discovery.id)) {
      node.discoveryIds.push(discovery.id);
    }

    parentId = node.id;
  });
}

function matchesLabel(
  node: KnowledgeGraph["nodes"][number],
  label: string,
): boolean {
  const normalizedLabel = normalizeText(label);

  return (
    normalizeText(node.title) === normalizedLabel ||
    node.aliases.some(
      (alias) => normalizeText(alias) === normalizedLabel,
    )
  );
}

function resolveDomainLabel(
  primaryCategory: string,
  secondaryCategory: string,
): string {
  const normalizedSecondary =
    secondaryCategory.trim();

  if (
    normalizedSecondary &&
    !isGenericDomainLabel(
      normalizedSecondary,
    )
  ) {
    return normalizedSecondary;
  }

  const normalizedPrimary =
    primaryCategory.trim();

  if (
    normalizedPrimary &&
    !isGenericDomainLabel(
      normalizedPrimary,
    )
  ) {
    return normalizedPrimary;
  }

  return "Noch nicht eingeordnet";
}

function isGenericDomainLabel(
  value: string,
): boolean {
  const normalized =
    value
      .trim()
      .toLocaleLowerCase()
      .replace(
        /[\s_-]+/g,
        " ",
      );

  return [
    "other",
    "others",
    "general",
    "miscellaneous",
    "misc",
    "unknown",
    "uncategorized",
    "unclassified",
    "sonstiges",
    "andere",
    "allgemein",
    "noch nicht eingeordnet",
    "nicht eingeordnet",
  ].includes(normalized);
}

function uniqueLabels(values: string[]): string[] {
  const seen = new Set<string>();

  return values.filter((value) => {
    const normalized = normalizeText(value);

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function formatLabel(value: string): string {
  const trimmed = value.trim();

  return trimmed === trimmed.toLowerCase()
    ? trimmed.replace(/\b\w/g, (letter) => letter.toUpperCase())
    : trimmed;
}

function getNodeKind(
  depth: number,
): KnowledgeGraph["nodes"][number]["kind"] {
  if (depth === 0) {
    return "domain";
  }

  if (depth === 1) {
    return "topic";
  }

  if (depth === 2) {
    return "subtopic";
  }

  return "concept";
}

function createProvisionalNodeId(
  parentId: string | null,
  label: string,
): string {
  return `node-${createSlug(`${parentId ?? "root"}-${label}`)}`;
}

function createSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "knowledge";
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function scheduleBackgroundRebuild(
  discoveries: Discovery[],
  sourceFingerprint: string,
  storedGraph: KnowledgeGraph,
): void {
  if (
    backgroundRebuild ||
    discoveries.length === 0 ||
    process.env.SAVEWISE_DISABLE_AI === "true"
  ) {
    return;
  }

  backgroundRebuild =
    buildKnowledgeGraphWithAI(
      discoveries,
      sourceFingerprint,
      storedGraph,
    )
      .then(saveKnowledgeGraph)
      .catch((error: unknown) => {
        console.error(
          "Background AI knowledge graph rebuild failed:",
          error,
        );
      })
      .finally(() => {
        backgroundRebuild = null;
      });
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
        { architectureVersion: KNOWLEDGE_ARCHITECTURE_VERSION, discoveries: normalizedDiscoveries },
      ),
    )
    .digest("hex");
}
