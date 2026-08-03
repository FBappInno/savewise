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
    return applyKnowledgeGraphOverrides(storedGraph);
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

    return immediateGraph;
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

      return applyKnowledgeGraphOverrides(storedGraph);
    }

    return null;
  }
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
    classification?.primaryCategory,
    classification?.secondaryCategory,
    classification?.topic,
    ...(classification?.subtopics ?? []),
  ];
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
        normalizedDiscoveries,
      ),
    )
    .digest("hex");
}
