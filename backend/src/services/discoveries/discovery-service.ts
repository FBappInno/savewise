import type {
  Discovery,
  KnowledgeLibrary,
} from "@savewise/shared";

import type { DiscoveryRepository } from "../../repositories/discovery-repository";
import {
  getOrBuildKnowledgeGraph,
  rebuildKnowledgeGraph,
} from "../knowledge/knowledge-graph-service";
import { buildKnowledgeLibrary } from "../library/library-builder";

export type RelatedDiscovery = {
  discovery: Discovery;

  score: number;

  reasons: string[];
};

export async function getAllDiscoveries(
  repository: DiscoveryRepository,
): Promise<Discovery[]> {
  const discoveries =
    await repository.getAll();

  return [...discoveries].sort(
    (first, second) =>
      new Date(
        second.createdAt,
      ).getTime() -
      new Date(
        first.createdAt,
      ).getTime(),
  );
}

export async function saveDiscovery(
  repository: DiscoveryRepository,
  discovery: Discovery,
): Promise<Discovery> {
  const existingDiscoveries =
    await repository.getAll();

  const normalizedDiscoveryUrl =
    normalizeUrl(discovery.url);

  const existingIndex =
    existingDiscoveries.findIndex(
      (existingDiscovery) =>
        normalizedDiscoveryUrl !== "" &&
        normalizeUrl(
          existingDiscovery.url,
        ) === normalizedDiscoveryUrl,
    );

  if (existingIndex >= 0) {
    const existingDiscovery =
      existingDiscoveries[
        existingIndex
      ];

    const updatedDiscovery: Discovery = {
      ...discovery,

      id: existingDiscovery.id,

      createdAt:
        existingDiscovery.createdAt,

      updatedAt:
        new Date().toISOString(),
    };

    const updatedDiscoveries = [
      ...existingDiscoveries,
    ];

    updatedDiscoveries[
      existingIndex
    ] = updatedDiscovery;

    await repository.saveAll(
      updatedDiscoveries,
    );

    return updatedDiscovery;
  }

  await repository.saveAll([
    ...existingDiscoveries,
    discovery,
  ]);

  return discovery;
}

export async function getDiscoveryById(
  repository: DiscoveryRepository,
  discoveryId: string,
): Promise<Discovery | null> {
  const discoveries =
    await repository.getAll();

  return (
    discoveries.find(
      (discovery) =>
        discovery.id === discoveryId,
    ) ?? null
  );
}

export async function deleteDiscovery(
  repository: DiscoveryRepository,
  discoveryId: string,
): Promise<boolean> {
  const discoveries =
    await repository.getAll();

  const updatedDiscoveries =
    discoveries.filter(
      (discovery) =>
        discovery.id !== discoveryId,
    );

  if (
    updatedDiscoveries.length ===
    discoveries.length
  ) {
    return false;
  }

  await repository.saveAll(
    updatedDiscoveries,
  );

  return true;
}

export async function buildCurrentKnowledgeLibrary(
  repository: DiscoveryRepository,
): Promise<KnowledgeLibrary> {
  const discoveries =
    await getAllDiscoveries(
      repository,
    );

  const library =
    buildKnowledgeLibrary(
      discoveries,
    );

  const graph =
    await getOrBuildKnowledgeGraph(
      discoveries,
    );

  return {
    ...library,

    graph,
  };
}

export async function rebuildCurrentKnowledgeLibrary(
  repository: DiscoveryRepository,
): Promise<KnowledgeLibrary> {
  const discoveries =
    await getAllDiscoveries(
      repository,
    );

  const library =
    buildKnowledgeLibrary(
      discoveries,
    );

  const graph =
    await rebuildKnowledgeGraph(
      discoveries,
    );

  return {
    ...library,

    graph,
  };
}

export async function getDiscoveriesForInterest(
  repository: DiscoveryRepository,
  interestId: string,
  limit = 50,
): Promise<Discovery[]> {
  const library =
    await buildCurrentKnowledgeLibrary(
      repository,
    );

  const graphNode =
    library.graph?.nodes.find(
      (node) =>
        node.id === interestId ||
        normalizeText(node.title) ===
          normalizeText(interestId) ||
        createSlug(node.title) ===
          createSlug(interestId),
    );

  if (graphNode) {
    const discoveryIdSet =
      new Set(
        graphNode.discoveryIds,
      );

    return library.discoveries
      .filter((discovery) =>
        discoveryIdSet.has(
          discovery.id,
        ),
      )
      .slice(0, limit);
  }

  const normalizedInterest =
    normalizeText(interestId);

  return library.discoveries
    .filter((discovery) => {
      const topic =
        discovery.classification
          ?.topic ??
        discovery.topics[0] ??
        "";

      return (
        createSlug(topic) ===
          createSlug(
            normalizedInterest,
          ) ||
        normalizeText(topic) ===
          normalizedInterest
      );
    })
    .slice(0, limit);
}

export async function getRelatedDiscoveries(
  repository: DiscoveryRepository,
  discoveryId: string,
  limit = 5,
): Promise<RelatedDiscovery[]> {
  const library =
    await buildCurrentKnowledgeLibrary(
      repository,
    );

  const sourceDiscovery =
    library.discoveries.find(
      (discovery) =>
        discovery.id === discoveryId,
    );

  if (!sourceDiscovery) {
    return [];
  }

  const graphRelations =
    calculateGraphRelations(
      sourceDiscovery,
      library.discoveries,
      library.graph,
    );

  if (graphRelations.length > 0) {
    return graphRelations.slice(
      0,
      limit,
    );
  }

  return library.discoveries
    .filter(
      (discovery) =>
        discovery.id !== discoveryId,
    )
    .map((discovery) =>
      calculateLegacyRelation(
        sourceDiscovery,
        discovery,
      ),
    )
    .filter(
      (
        relation,
      ): relation is RelatedDiscovery =>
        relation !== null,
    )
    .sort(
      (first, second) =>
        second.score -
        first.score,
    )
    .slice(0, limit);
}

function calculateGraphRelations(
  sourceDiscovery: Discovery,
  discoveries: Discovery[],
  graph: KnowledgeLibrary["graph"],
): RelatedDiscovery[] {
  if (!graph) {
    return [];
  }

  const sourceNodes =
    graph.nodes.filter((node) =>
      node.discoveryIds.includes(
        sourceDiscovery.id,
      ),
    );

  if (sourceNodes.length === 0) {
    return [];
  }

  const sourceNodeIds =
    new Set(
      sourceNodes.map(
        (node) => node.id,
      ),
    );

  const candidateScores =
    new Map<
      string,
      {
        score: number;
        reasons: string[];
      }
    >();

  for (const node of sourceNodes) {
    for (
      const candidateId of
        node.discoveryIds
    ) {
      if (
        candidateId ===
        sourceDiscovery.id
      ) {
        continue;
      }

      addCandidateScore(
        candidateScores,
        candidateId,
        node.confidence * 0.65,
        `Shared knowledge node: ${node.title}`,
      );
    }
  }

  for (
    const relation of
      graph.relations
  ) {
    let connectedNodeId:
      | string
      | null = null;

    if (
      sourceNodeIds.has(
        relation.sourceId,
      )
    ) {
      connectedNodeId =
        relation.targetId;
    } else if (
      sourceNodeIds.has(
        relation.targetId,
      )
    ) {
      connectedNodeId =
        relation.sourceId;
    }

    if (!connectedNodeId) {
      continue;
    }

    const connectedNode =
      graph.nodes.find(
        (node) =>
          node.id ===
          connectedNodeId,
      );

    if (!connectedNode) {
      continue;
    }

    for (
      const candidateId of
        connectedNode.discoveryIds
    ) {
      if (
        candidateId ===
        sourceDiscovery.id
      ) {
        continue;
      }

      addCandidateScore(
        candidateScores,
        candidateId,
        relation.strength * 0.35,
        relation.reason,
      );
    }
  }

  return [
    ...candidateScores.entries(),
  ]
    .map(
      ([
        candidateId,
        candidateData,
      ]) => {
        const discovery =
          discoveries.find(
            (item) =>
              item.id ===
              candidateId,
          );

        if (!discovery) {
          return null;
        }

        return {
          discovery,

          score: Number(
            Math.min(
              1,
              candidateData.score,
            ).toFixed(4),
          ),

          reasons:
            uniqueStrings(
              candidateData.reasons,
            ),
        };
      },
    )
    .filter(
      (
        relation,
      ): relation is RelatedDiscovery =>
        relation !== null,
    )
    .sort(
      (first, second) =>
        second.score -
        first.score,
    );
}

function addCandidateScore(
  candidateScores: Map<
    string,
    {
      score: number;
      reasons: string[];
    }
  >,
  discoveryId: string,
  score: number,
  reason: string,
): void {
  const existing =
    candidateScores.get(
      discoveryId,
    ) ?? {
      score: 0,
      reasons: [],
    };

  existing.score += score;

  if (
    reason.trim() &&
    !existing.reasons.includes(
      reason,
    )
  ) {
    existing.reasons.push(
      reason,
    );
  }

  candidateScores.set(
    discoveryId,
    existing,
  );
}

function calculateLegacyRelation(
  source: Discovery,
  candidate: Discovery,
): RelatedDiscovery | null {
  let score = 0;

  const reasons: string[] = [];

  const sourceTopic =
    source.classification?.topic ??
    source.topics[0] ??
    "";

  const candidateTopic =
    candidate.classification
      ?.topic ??
    candidate.topics[0] ??
    "";

  if (
    normalizeText(sourceTopic) &&
    normalizeText(sourceTopic) ===
      normalizeText(
        candidateTopic,
      )
  ) {
    score += 0.5;

    reasons.push(
      `Same topic: ${sourceTopic}`,
    );
  }

  const sourceCategory =
    source.classification
      ?.primaryCategory;

  const candidateCategory =
    candidate.classification
      ?.primaryCategory;

  if (
    sourceCategory &&
    sourceCategory ===
      candidateCategory
  ) {
    score += 0.15;

    reasons.push(
      `Same category: ${sourceCategory}`,
    );
  }

  const sharedKeywords =
    findSharedValues(
      source.keywords,
      candidate.keywords,
    );

  if (
    sharedKeywords.length > 0
  ) {
    const maximumKeywordCount =
      Math.max(
        source.keywords.length,
        candidate.keywords.length,
        1,
      );

    score +=
      (sharedKeywords.length /
        maximumKeywordCount) *
      0.35;

    reasons.push(
      `Shared keywords: ${sharedKeywords.join(
        ", ",
      )}`,
    );
  }

  if (score <= 0) {
    return null;
  }

  return {
    discovery: candidate,

    score: Number(
      Math.min(
        1,
        score,
      ).toFixed(4),
    ),

    reasons,
  };
}

function findSharedValues(
  firstValues: string[],
  secondValues: string[],
): string[] {
  const normalizedSecondValues =
    new Set(
      secondValues.map(
        normalizeText,
      ),
    );

  return firstValues.filter(
    (value) =>
      normalizedSecondValues.has(
        normalizeText(value),
      ),
  );
}

function normalizeUrl(
  url: string | undefined,
): string {
  if (!url) {
    return "";
  }

  try {
    const normalizedUrl =
      new URL(url);

    normalizedUrl.hash = "";

    return normalizedUrl
      .toString()
      .replace(/\/$/, "")
      .toLowerCase();
  } catch {
    return url
      .trim()
      .replace(/\/$/, "")
      .toLowerCase();
  }
}

function normalizeText(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase();
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

  return slug || "uncategorized";
}

function uniqueStrings(
  values: string[],
): string[] {
  return [
    ...new Set(
      values.filter(Boolean),
    ),
  ];
}