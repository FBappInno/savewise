import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod/v3";

import type {
  Discovery,
  KnowledgeGraph,
  KnowledgeGraphNode,
  KnowledgeGraphRelation,
} from "@savewise/shared";

import type { KnowledgeGraphAnalysis } from "../../types/knowledge-graph-analysis";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120_000,
  maxRetries: 1,
});

const NodeKindSchema = z.enum([
  "domain",
  "topic",
  "subtopic",
  "concept",
]);

const RelationKindSchema = z.enum([
  "related",
  "supports",
  "contrasts",
  "depends-on",
  "part-of",
  "applies-to",
]);

const KnowledgeGraphAnalysisSchema = z.object({
  language: z
    .string()
    .min(2)
    .max(20),

  summary: z
    .string()
    .min(20)
    .max(800),

  nodes: z
    .array(
      z.object({
        key: z
          .string()
          .min(2)
          .max(100),

        title: z
          .string()
          .min(2)
          .max(100),

        kind: NodeKindSchema,

        description: z
          .string()
          .min(10)
          .max(400),

        parentKey: z
          .string()
          .min(2)
          .max(100)
          .nullable(),

        discoveryIds: z
          .array(
            z
              .string()
              .min(1)
              .max(100),
          )
          .max(200),

        aliases: z
          .array(
            z
              .string()
              .min(1)
              .max(80),
          )
          .max(12),

        keywords: z
          .array(
            z
              .string()
              .min(1)
              .max(60),
          )
          .max(20),

        confidence: z
          .number()
          .min(0)
          .max(1),
      }),
    )
    .min(1)
    .max(200),

  relations: z
    .array(
      z.object({
        sourceKey: z
          .string()
          .min(2)
          .max(100),

        targetKey: z
          .string()
          .min(2)
          .max(100),

        kind: RelationKindSchema,

        strength: z
          .number()
          .min(0)
          .max(1),

        reason: z
          .string()
          .min(5)
          .max(300),

        evidenceDiscoveryIds: z
          .array(
            z
              .string()
              .min(1)
              .max(100),
          )
          .max(50),
      }),
    )
    .max(300),
});

export async function buildKnowledgeGraphWithAI(
  discoveries: Discovery[],
  sourceFingerprint: string,
  previousGraph: KnowledgeGraph | null = null,
): Promise<KnowledgeGraph> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured.",
    );
  }

  if (discoveries.length === 0) {
    return createEmptyKnowledgeGraph(
      sourceFingerprint,
    );
  }

  const compactDiscoveries =
    discoveries.map(
      (discovery) => ({
        id: discovery.id,

        title:
          discovery.improvedTitle ||
          discovery.title,

        summary:
          discovery.summary ?? "",

        description:
          discovery.description ?? "",

        keywords:
          discovery.keywords,

        language:
          discovery.language ?? null,

        createdAt:
          discovery.createdAt,
      }),
    );

  const response =
    await openai.responses.parse({
      model: "gpt-4.1-mini",

      instructions: [
        "You are the AI Knowledge Architect for SaveWise.",
        "You receive the complete saved knowledge library of one user.",
        "Build a personal knowledge graph based exclusively on the supplied discoveries.",
        "Do not use a predefined taxonomy or fixed list of topics.",
        "Infer all domains, topics, subtopics and concepts dynamically from the user's actual content.",
        "Treat the previous graph as evolutionary context, not as a taxonomy that must be preserved.",
        "Keep useful stable concepts and keys, but reorganize, rename, merge or replace them whenever the complete discovery set supports a better structure.",
        "Unify synonyms, translations and closely related multilingual terms under one canonical node and retain useful alternatives as aliases.",
        "Create new broader parent concepts when several existing or new nodes share a meaningful umbrella concept.",
        "Organize the knowledge as a coherent hierarchy.",
        "The hierarchy may have up to four semantic levels:",
        "domain -> topic -> subtopic -> concept.",
        "Only create levels that are useful for the supplied library.",
        "Assign discovery IDs directly only to the lowest meaningful nodes.",
        "Parent nodes must receive discoveries indirectly through their descendants, never as duplicate direct assignments.",
        "Every discovery must be assigned to at least one meaningful node.",
        "Use the supplied discovery IDs exactly as provided.",
        "Do not invent discovery IDs.",
        "Use stable, concise node keys written in lowercase kebab-case.",
        "Every node key must be unique.",
        "parentKey must reference another returned node key or be null.",
        "Do not create circular parent relationships.",
        "Merge synonyms and closely overlapping themes into one node.",
        "Store alternative terminology in aliases.",
        "Do not create separate nodes merely because two discoveries use different languages.",
        "Use titles in the dominant language of the user's discoveries.",
        "Prefer meaningful user-specific organization over generic categories.",
        "Create broader shared parents when several discoveries belong to related areas.",
        "Example only, not a required taxonomy:",
        "content about proteins and carbohydrates could be organized under a broader nutrition topic.",
        "The example must not force nutrition or any other topic into unrelated libraries.",
        "Create relations only when a meaningful semantic relationship exists.",
        "Relation strength must represent the strength of evidence in the supplied library.",
        "Confidence must represent how strongly the discoveries support the node.",
        "Return a concise summary of the user's current knowledge landscape.",
      ].join("\n"),

      input: JSON.stringify({
        discoveryCount:
          compactDiscoveries.length,

        discoveries:
          compactDiscoveries,

        previousGraph:
          previousGraph
            ? compactPreviousGraph(
                previousGraph,
              )
            : null,
      }),

      text: {
        format: zodTextFormat(
          KnowledgeGraphAnalysisSchema,
          "savewise_knowledge_graph",
        ),
      },
    });

  if (!response.output_parsed) {
    throw new Error(
      "AI returned no structured knowledge graph.",
    );
  }

  return convertAnalysisToGraph(
    response.output_parsed,
    discoveries,
    sourceFingerprint,
  );
}

function compactPreviousGraph(
  graph: KnowledgeGraph,
) {
  return {
    language: graph.language,
    summary: graph.summary,
    nodes: graph.nodes.map((node) => ({
      key: node.id.replace(/^node-/, ""),
      title: node.title,
      kind: node.kind,
      description: node.description,
      parentKey: node.parentId?.replace(
        /^node-/,
        "",
      ) ?? null,
      discoveryIds: node.discoveryIds,
      aliases: node.aliases,
      keywords: node.keywords,
      confidence: node.confidence,
    })),
    relations: graph.relations.map(
      (relation) => ({
        sourceKey: relation.sourceId.replace(
          /^node-/,
          "",
        ),
        targetKey: relation.targetId.replace(
          /^node-/,
          "",
        ),
        kind: relation.kind,
        strength: relation.strength,
        reason: relation.reason,
        evidenceDiscoveryIds:
          relation.evidenceDiscoveryIds,
      }),
    ),
  };
}

function convertAnalysisToGraph(
  analysis: KnowledgeGraphAnalysis,
  discoveries: Discovery[],
  sourceFingerprint: string,
): KnowledgeGraph {
  const validDiscoveryIds =
    new Set(
      discoveries.map(
        (discovery) =>
          discovery.id,
      ),
    );

  const uniqueNodes =
    deduplicateNodes(
      analysis.nodes,
    );

  const keyToId = new Map<
    string,
    string
  >();

  for (const node of uniqueNodes) {
    keyToId.set(
      normalizeKey(node.key),
      createNodeId(node.key),
    );
  }

  const nodes: KnowledgeGraphNode[] =
    uniqueNodes.map((node) => {
      const normalizedKey =
        normalizeKey(node.key);

      const id =
        keyToId.get(normalizedKey) ??
        createNodeId(normalizedKey);

      const normalizedParentKey =
        node.parentKey
          ? normalizeKey(
              node.parentKey,
            )
          : null;

      const parentId =
        normalizedParentKey &&
        normalizedParentKey !==
          normalizedKey
          ? keyToId.get(
              normalizedParentKey,
            ) ?? null
          : null;

      const discoveryIds =
        uniqueStrings(
          node.discoveryIds.filter(
            (discoveryId) =>
              validDiscoveryIds.has(
                discoveryId,
              ),
          ),
        );

      return {
        id,

        title:
          node.title.trim(),

        kind:
          node.kind,

        description:
          node.description.trim(),

        parentId,

        childIds: [],

        discoveryIds,

        aliases:
          uniqueStrings(
            node.aliases,
          ),

        keywords:
          uniqueStrings(
            node.keywords,
          ),

        confidence:
          normalizeScore(
            node.confidence,
          ),
      };
    });

  const nodeMap = new Map(
    nodes.map((node) => [
      node.id,
      node,
    ]),
  );

  for (const node of nodes) {
    if (!node.parentId) {
      continue;
    }

    const parent =
      nodeMap.get(
        node.parentId,
      );

    if (
      parent &&
      !parent.childIds.includes(
        node.id,
      )
    ) {
      parent.childIds.push(
        node.id,
      );
    }
  }

  assignMissingDiscoveries(
    nodes,
    discoveries,
  );

  propagateDiscoveryIds(
    nodes,
  );

  const filteredNodes = nodes;

  const filteredNodeMap =
    new Map(
      filteredNodes.map(
        (node) => [
          node.id,
          node,
        ],
      ),
    );

  cleanInvalidReferences(
    filteredNodes,
    filteredNodeMap,
  );

  const relations =
    buildRelations(
      analysis,
      keyToId,
      filteredNodeMap,
      validDiscoveryIds,
    );

  const rootNodeIds =
    filteredNodes
      .filter(
        (node) =>
          node.parentId === null,
      )
      .map(
        (node) =>
          node.id,
      );

  return {
    generatedAt:
      new Date().toISOString(),

    sourceFingerprint,

    language:
      analysis.language.trim(),

    summary:
      analysis.summary.trim(),

    rootNodeIds,

    nodes:
      filteredNodes,

    relations,
  };
}

function buildRelations(
  analysis: KnowledgeGraphAnalysis,
  keyToId: Map<string, string>,
  nodeMap: Map<
    string,
    KnowledgeGraphNode
  >,
  validDiscoveryIds: Set<string>,
): KnowledgeGraphRelation[] {
  const relations:
    KnowledgeGraphRelation[] = [];

  const relationKeys =
    new Set<string>();

  for (
    const relation of
      analysis.relations
  ) {
    const sourceId =
      keyToId.get(
        normalizeKey(
          relation.sourceKey,
        ),
      );

    const targetId =
      keyToId.get(
        normalizeKey(
          relation.targetKey,
        ),
      );

    if (
      !sourceId ||
      !targetId ||
      sourceId === targetId ||
      !nodeMap.has(sourceId) ||
      !nodeMap.has(targetId)
    ) {
      continue;
    }

    const relationKey = [
      sourceId,
      targetId,
      relation.kind,
    ]
      .sort()
      .join(":");

    if (
      relationKeys.has(
        relationKey,
      )
    ) {
      continue;
    }

    relationKeys.add(
      relationKey,
    );

    relations.push({
      id: createRelationId(
        sourceId,
        targetId,
        relation.kind,
      ),

      sourceId,

      targetId,

      kind:
        relation.kind,

      strength:
        normalizeScore(
          relation.strength,
        ),

      reason:
        relation.reason.trim(),

      evidenceDiscoveryIds:
        uniqueStrings(
          relation
            .evidenceDiscoveryIds
            .filter(
              (discoveryId) =>
                validDiscoveryIds.has(
                  discoveryId,
                ),
            ),
        ),
    });
  }

  return relations.sort(
    (first, second) =>
      second.strength -
      first.strength,
  );
}

function deduplicateNodes(
  nodes:
    KnowledgeGraphAnalysis["nodes"],
): KnowledgeGraphAnalysis["nodes"] {
  const nodeMap = new Map<
    string,
    KnowledgeGraphAnalysis["nodes"][number]
  >();

  for (const node of nodes) {
    const key =
      normalizeKey(
        node.key,
      );

    if (!key) {
      continue;
    }

    if (!nodeMap.has(key)) {
      nodeMap.set(key, {
        ...node,
        key,
      });
    }
  }

  return [
    ...nodeMap.values(),
  ];
}

function assignMissingDiscoveries(
  nodes: KnowledgeGraphNode[],
  discoveries: Discovery[],
): void {
  const assignedDiscoveryIds =
    new Set(
      nodes.flatMap(
        (node) =>
          node.discoveryIds,
      ),
    );

  const missingDiscoveries =
    discoveries.filter(
      (discovery) =>
        !assignedDiscoveryIds.has(
          discovery.id,
        ),
    );

  if (
    missingDiscoveries.length === 0
  ) {
    return;
  }

  for (
    const discovery of
      missingDiscoveries
  ) {
    const title =
      discovery.improvedTitle ||
      discovery.title;

    nodes.push({
      id: createNodeId(
        `${title}-${discovery.id}`,
      ),
      title,
      kind: "concept",
      description:
        discovery.summary ||
        discovery.description ||
        title,
      parentId: null,
      childIds: [],
      discoveryIds: [
        discovery.id,
      ],
      aliases: [],
      keywords: uniqueStrings(
        discovery.keywords,
      ),
      confidence:
        normalizeScore(
          discovery.confidence ??
            0,
        ),
    });
  }
}

function cleanInvalidReferences(
  nodes: KnowledgeGraphNode[],
  nodeMap: Map<
    string,
    KnowledgeGraphNode
  >,
): void {
  for (const node of nodes) {
    if (
      node.parentId &&
      !nodeMap.has(
        node.parentId,
      )
    ) {
      node.parentId =
        null;
    }

    node.childIds =
      uniqueStrings(
        node.childIds.filter(
          (childId) =>
            nodeMap.has(
              childId,
            ),
        ),
      );
  }
}

function propagateDiscoveryIds(
  nodes: KnowledgeGraphNode[],
): void {
  const nodeMap = new Map(
    nodes.map((node) => [
      node.id,
      node,
    ]),
  );

  function collectDiscoveryIds(
    node: KnowledgeGraphNode,
    visited: Set<string>,
  ): string[] {
    if (
      visited.has(
        node.id,
      )
    ) {
      return node.discoveryIds;
    }

    visited.add(
      node.id,
    );

    const descendantIds =
      node.childIds.flatMap(
        (childId) => {
          const child =
            nodeMap.get(
              childId,
            );

          return child
            ? collectDiscoveryIds(
                child,
                new Set(visited),
              )
            : [];
        },
      );

    node.discoveryIds =
      uniqueStrings([
        ...node.discoveryIds,
        ...descendantIds,
      ]);

    return node.discoveryIds;
  }

  for (const node of nodes) {
    collectDiscoveryIds(
      node,
      new Set<string>(),
    );
  }
}

function createEmptyKnowledgeGraph(
  sourceFingerprint: string,
): KnowledgeGraph {
  return {
    generatedAt:
      new Date().toISOString(),

    sourceFingerprint,

    language:
      "en",

    summary:
      "No discoveries have been added yet.",

    rootNodeIds:
      [],

    nodes:
      [],

    relations:
      [],
  };
}

function normalizeKey(
  value: string,
): string {
  return createSlug(
    value,
  );
}

function createNodeId(
  key: string,
): string {
  return `node-${createSlug(
    key,
  )}`;
}

function createRelationId(
  sourceId: string,
  targetId: string,
  kind: string,
): string {
  return [
    "relation",
    sourceId,
    targetId,
    createSlug(kind),
  ].join("-");
}

function normalizeScore(
  value: number,
): number {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return Number(
    Math.min(
      1,
      Math.max(
        0,
        value,
      ),
    ).toFixed(4),
  );
}

function uniqueStrings(
  values: string[],
): string[] {
  const result: string[] =
    [];

  const normalizedValues =
    new Set<string>();

  for (const value of values) {
    const trimmedValue =
      value.trim();

    const normalizedValue =
      trimmedValue.toLocaleLowerCase();

    if (
      !trimmedValue ||
      normalizedValues.has(
        normalizedValue,
      )
    ) {
      continue;
    }

    normalizedValues.add(
      normalizedValue,
    );

    result.push(
      trimmedValue,
    );
  }

  return result;
}

function createSlug(
  value: string,
): string {
  const slug = value
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );

  return (
    slug ||
    "uncategorized"
  );
}
