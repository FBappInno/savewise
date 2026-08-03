import type {
  Discovery,
  KnowledgeGraph,
  KnowledgeGraphNode,
} from "@savewise/shared";

import {
  loadKnowledgeGraphOverrides,
  saveKnowledgeGraphOverride,
  type KnowledgeGraphNodeOverride,
  type KnowledgeNodeReference,
} from "../../persistence/knowledge/knowledge-graph-override-store";
import { saveKnowledgeGraph } from "../../persistence/knowledge/knowledge-graph-store";

export async function applyKnowledgeGraphOverrides(
  graph: KnowledgeGraph,
): Promise<KnowledgeGraph> {
  const overrides = await loadKnowledgeGraphOverrides();
  return applyOverridesToGraph(graph, overrides);
}

export function applyOverridesToGraph(
  graph: KnowledgeGraph,
  overrides: KnowledgeGraphNodeOverride[],
): KnowledgeGraph {
  if (overrides.length === 0) return graph;

  const nodes = graph.nodes.map((node) => ({
    ...node,
    childIds: [...node.childIds],
    discoveryIds: [...node.discoveryIds],
    aliases: [...node.aliases],
    keywords: [...node.keywords],
  }));
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  for (const override of overrides) {
    const node = findNode(nodes, override.node);
    if (!node) continue;

    node.title = override.title;
    const parent = override.parent
      ? findNode(nodes, override.parent)
      : null;

    if (
      !override.parent ||
      (parent && parent.id !== node.id && !isDescendant(parent.id, node.id, nodeMap))
    ) {
      node.parentId = parent?.id ?? null;
    }
  }

  rebuildHierarchy(nodes);
  return {
    ...graph,
    rootNodeIds: nodes.filter((node) => node.parentId === null).map((node) => node.id),
    nodes,
  };
}

export async function updateKnowledgeGraphNode(
  discoveries: Discovery[],
  graph: KnowledgeGraph,
  nodeId: string,
  update: { title: string; parentId: string | null },
): Promise<KnowledgeGraph> {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error("Knowledge topic not found.");

  const parent = update.parentId
    ? graph.nodes.find((candidate) => candidate.id === update.parentId)
    : null;
  if (update.parentId && !parent) throw new Error("Parent topic not found.");
  if (parent && (parent.id === node.id || isDescendant(parent.id, node.id, new Map(
    graph.nodes.map((candidate) => [candidate.id, candidate]),
  )))) {
    throw new Error("A topic cannot be moved below itself.");
  }

  const validDiscoveryIds = new Set(discoveries.map((discovery) => discovery.id));
  const override: KnowledgeGraphNodeOverride = {
    node: createReference(node, validDiscoveryIds),
    title: update.title.trim(),
    parent: parent ? createReference(parent, validDiscoveryIds) : null,
    updatedAt: new Date().toISOString(),
  };

  await saveKnowledgeGraphOverride(override);
  const updatedGraph = await applyKnowledgeGraphOverrides(graph);
  await saveKnowledgeGraph(updatedGraph);
  return updatedGraph;
}

function createReference(
  node: KnowledgeGraphNode,
  validDiscoveryIds: Set<string>,
): KnowledgeNodeReference {
  return {
    id: node.id,
    title: node.title,
    kind: node.kind,
    discoveryIds: node.discoveryIds.filter((id) => validDiscoveryIds.has(id)),
  };
}

function findNode(
  nodes: KnowledgeGraphNode[],
  reference: KnowledgeNodeReference,
): KnowledgeGraphNode | undefined {
  const exact = nodes.find((node) => node.id === reference.id);
  if (exact) return exact;

  const referenceIds = new Set(reference.discoveryIds);
  return nodes
    .filter((node) => node.kind === reference.kind)
    .map((node) => ({
      node,
      overlap: node.discoveryIds.filter((id) => referenceIds.has(id)).length,
    }))
    .filter(({ overlap }) => overlap > 0)
    .sort((left, right) => right.overlap - left.overlap)[0]?.node;
}

function isDescendant(
  candidateId: string,
  ancestorId: string,
  nodeMap: Map<string, KnowledgeGraphNode>,
): boolean {
  let current = nodeMap.get(candidateId);
  const visited = new Set<string>();
  while (current?.parentId && !visited.has(current.id)) {
    if (current.parentId === ancestorId) return true;
    visited.add(current.id);
    current = nodeMap.get(current.parentId);
  }
  return false;
}

function rebuildHierarchy(nodes: KnowledgeGraphNode[]): void {
  const nodeIds = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    node.childIds = [];
    if (node.parentId && !nodeIds.has(node.parentId)) node.parentId = null;
  }
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    if (!node.parentId) continue;
    nodeMap.get(node.parentId)?.childIds.push(node.id);
  }
}
