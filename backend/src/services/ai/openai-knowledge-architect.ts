import type {
  Discovery,
  KnowledgeGraph,
  KnowledgeGraphNode,
} from "@savewise/shared";

type MutableTaxonomyNode = KnowledgeGraphNode & {
  labelVariants: Map<string, number>;
};

const UNCLASSIFIED_DOMAIN =
  "Noch nicht eingeordnet";

/**
 * Builds the visible knowledge hierarchy exclusively from persisted
 * Discovery classifications. AI-generated descriptions, aliases and
 * relations may be added in a separate enrichment step, but must never
 * change this structure or its discovery assignments.
 */
export function buildDeterministicKnowledgeGraph(
  discoveries: Discovery[],
  sourceFingerprint: string,
): KnowledgeGraph {
  const nodesByPath =
    new Map<string, MutableTaxonomyNode>();

  const sortedDiscoveries =
    [...discoveries].sort((left, right) =>
      left.id.localeCompare(right.id),
    );

  for (const discovery of sortedDiscoveries) {
    const classification =
      discovery.classification;

    const domainLabel =
      classification?.secondaryCategory.trim() ||
      UNCLASSIFIED_DOMAIN;

    const domainKey =
      normalizeTaxonomyKey(domainLabel) ||
      normalizeTaxonomyKey(UNCLASSIFIED_DOMAIN);

    const domainPath =
      createTaxonomyPath("domain", [domainKey]);

    const domain = getOrCreateNode(
      nodesByPath,
      domainPath,
      domainLabel,
      "domain",
      null,
      discovery,
    );

    const topicLabel =
      classification?.topic.trim() ?? "";

    if (!topicLabel) {
      addDiscovery(domain, discovery.id);
      continue;
    }

    const topicKey =
      normalizeTaxonomyKey(topicLabel);

    const topicPath =
      createTaxonomyPath(
        "topic",
        [domainKey, topicKey],
      );

    const topic = getOrCreateNode(
      nodesByPath,
      topicPath,
      topicLabel,
      "topic",
      domain.id,
      discovery,
    );

    const subtopics = uniqueLabels(
      classification?.subtopics ?? [],
    );

    if (subtopics.length === 0) {
      addDiscovery(topic, discovery.id);
      continue;
    }

    for (const subtopicLabel of subtopics) {
      const subtopicKey =
        normalizeTaxonomyKey(subtopicLabel);

      const subtopicPath =
        createTaxonomyPath(
          "subtopic",
          [domainKey, topicKey, subtopicKey],
        );

      const subtopic = getOrCreateNode(
        nodesByPath,
        subtopicPath,
        subtopicLabel,
        "subtopic",
        topic.id,
        discovery,
      );

      addDiscovery(subtopic, discovery.id);
    }
  }

  const mutableNodes =
    [...nodesByPath.values()];

  const mutableNodesById =
    new Map(
      mutableNodes.map((node) => [
        node.id,
        node,
      ]),
    );

  for (const node of mutableNodes) {
    node.childIds = [];

    const canonicalTitle =
      selectCanonicalLabel(
        node.labelVariants,
      );

    node.title = canonicalTitle;
    node.aliases = [...node.labelVariants.keys()]
      .filter(
        (label) =>
          label !== canonicalTitle,
      )
      .sort((left, right) =>
        left.localeCompare(right),
      );
  }

  for (const node of mutableNodes) {
    if (!node.parentId) {
      continue;
    }

    const parent =
      mutableNodesById.get(node.parentId);

    if (!parent) {
      throw new Error(
        `Knowledge graph node ${node.id} has no parent ${node.parentId}.`,
      );
    }

    parent.childIds.push(node.id);
  }

  const nodes = mutableNodes
    .map(({ labelVariants: _, ...node }) => ({
      ...node,
      childIds: [...node.childIds].sort(),
      discoveryIds: [...node.discoveryIds].sort(),
    }))
    .sort((left, right) =>
      left.id.localeCompare(right.id),
    );

  const graph: KnowledgeGraph = {
    generatedAt: new Date().toISOString(),
    sourceFingerprint,
    language: selectLanguage(sortedDiscoveries),
    summary:
      `Deterministic knowledge graph for ${discoveries.length} discoveries.`,
    rootNodeIds: nodes
      .filter((node) => node.parentId === null)
      .map((node) => node.id)
      .sort(),
    nodes,
    relations: [],
  };

  validateDeterministicKnowledgeGraph(
    graph,
    discoveries,
  );

  return graph;
}

export function validateDeterministicKnowledgeGraph(
  graph: KnowledgeGraph,
  discoveries: Discovery[],
): void {
  const nodesById =
    new Map(
      graph.nodes.map((node) => [
        node.id,
        node,
      ]),
    );

  const rootDomains = graph.rootNodeIds
    .map((id) => nodesById.get(id))
    .filter(
      (node): node is KnowledgeGraphNode =>
        Boolean(node),
    );

  const domainTitles =
    new Set<string>();

  for (const domain of rootDomains) {
    if (
      domain.kind !== "domain" ||
      domain.parentId !== null
    ) {
      throw new Error(
        `Knowledge graph root ${domain.id} is not a root domain.`,
      );
    }

    const key =
      normalizeTaxonomyKey(domain.title);

    if (domainTitles.has(key)) {
      throw new Error(
        `Duplicate root domain: ${domain.title}.`,
      );
    }

    domainTitles.add(key);
  }

  for (const discovery of discoveries) {
    const classification =
      discovery.classification;

    const domainLabel =
      classification?.secondaryCategory.trim() ||
      UNCLASSIFIED_DOMAIN;

    const domainKey =
      normalizeTaxonomyKey(domainLabel) ||
      normalizeTaxonomyKey(UNCLASSIFIED_DOMAIN);

    const domain = nodesById.get(
      createNodeId(
        createTaxonomyPath(
          "domain",
          [domainKey],
        ),
      ),
    );

    if (!domain || domain.parentId !== null) {
      throw new Error(
        `Discovery ${discovery.id} has no canonical domain.`,
      );
    }

    const topicLabel =
      classification?.topic.trim() ?? "";

    if (!topicLabel) {
      assertDiscoveryAssignment(
        domain,
        discovery.id,
      );
      continue;
    }

    const topicKey =
      normalizeTaxonomyKey(topicLabel);

    const topic = nodesById.get(
      createNodeId(
        createTaxonomyPath(
          "topic",
          [domainKey, topicKey],
        ),
      ),
    );

    if (
      !topic ||
      topic.kind !== "topic" ||
      topic.parentId !== domain.id
    ) {
      throw new Error(
        `Discovery ${discovery.id} has no canonical topic ${topicLabel}.`,
      );
    }

    const subtopics = uniqueLabels(
      classification?.subtopics ?? [],
    );

    if (subtopics.length === 0) {
      assertDiscoveryAssignment(
        topic,
        discovery.id,
      );
      continue;
    }

    for (const subtopicLabel of subtopics) {
      const subtopic = nodesById.get(
        createNodeId(
          createTaxonomyPath(
            "subtopic",
            [
              domainKey,
              topicKey,
              normalizeTaxonomyKey(
                subtopicLabel,
              ),
            ],
          ),
        ),
      );

      if (
        !subtopic ||
        subtopic.kind !== "subtopic" ||
        subtopic.parentId !== topic.id
      ) {
        throw new Error(
          `Discovery ${discovery.id} has no canonical subtopic ${subtopicLabel}.`,
        );
      }

      assertDiscoveryAssignment(
        subtopic,
        discovery.id,
      );
    }
  }
}

function getOrCreateNode(
  nodesByPath: Map<string, MutableTaxonomyNode>,
  path: string,
  label: string,
  kind: KnowledgeGraphNode["kind"],
  parentId: string | null,
  discovery: Discovery,
): MutableTaxonomyNode {
  const existing =
    nodesByPath.get(path);

  if (existing) {
    recordLabelVariant(
      existing.labelVariants,
      label,
    );
    existing.confidence = Math.max(
      existing.confidence,
      discovery.confidence ?? 0.5,
    );
    existing.keywords = uniqueLabels([
      ...existing.keywords,
      ...discovery.keywords,
    ]);
    return existing;
  }

  const labelVariants =
    new Map<string, number>();

  recordLabelVariant(
    labelVariants,
    label,
  );

  const node: MutableTaxonomyNode = {
    id: createNodeId(path),
    title: label.trim(),
    kind,
    description:
      `Knowledge about ${label.trim()}.`,
    parentId,
    childIds: [],
    discoveryIds: [],
    aliases: [],
    keywords: uniqueLabels(
      discovery.keywords,
    ),
    confidence:
      discovery.confidence ?? 0.5,
    labelVariants,
  };

  nodesByPath.set(path, node);
  return node;
}

function addDiscovery(
  node: MutableTaxonomyNode,
  discoveryId: string,
): void {
  if (!node.discoveryIds.includes(discoveryId)) {
    node.discoveryIds.push(discoveryId);
  }
}

function assertDiscoveryAssignment(
  node: KnowledgeGraphNode,
  discoveryId: string,
): void {
  if (!node.discoveryIds.includes(discoveryId)) {
    throw new Error(
      `Discovery ${discoveryId} is not assigned to ${node.id}.`,
    );
  }
}

function createTaxonomyPath(
  kind: "domain" | "topic" | "subtopic",
  parts: string[],
): string {
  return [kind, ...parts].join("/");
}

function createNodeId(path: string): string {
  return `node-${path
    .split("/")
    .map(createSlug)
    .join("-")}`;
}

function normalizeTaxonomyKey(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createSlug(value: string): string {
  return normalizeTaxonomyKey(value)
    .replace(/\s+/g, "-") ||
    "unclassified";
}

function uniqueLabels(
  values: string[],
): string[] {
  const labels =
    new Map<string, string>();

  for (const value of values) {
    const label = value.trim();
    const key =
      normalizeTaxonomyKey(label);

    if (!key || labels.has(key)) {
      continue;
    }

    labels.set(key, label);
  }

  return [...labels.values()];
}

function recordLabelVariant(
  variants: Map<string, number>,
  value: string,
): void {
  const label = value.trim();

  variants.set(
    label,
    (variants.get(label) ?? 0) + 1,
  );
}

function selectCanonicalLabel(
  variants: Map<string, number>,
): string {
  return [...variants.entries()]
    .sort(
      ([leftLabel, leftCount], [rightLabel, rightCount]) =>
        rightCount - leftCount ||
        leftLabel.localeCompare(rightLabel),
    )[0]?.[0] ?? UNCLASSIFIED_DOMAIN;
}

function selectLanguage(
  discoveries: Discovery[],
): string {
  const counts =
    new Map<string, number>();

  for (const discovery of discoveries) {
    const language =
      discovery.language?.trim();

    if (!language) {
      continue;
    }

    counts.set(
      language,
      (counts.get(language) ?? 0) + 1,
    );
  }

  return [...counts.entries()]
    .sort(
      ([leftLanguage, leftCount], [rightLanguage, rightCount]) =>
        rightCount - leftCount ||
        leftLanguage.localeCompare(rightLanguage),
    )[0]?.[0] ?? "en";
}
