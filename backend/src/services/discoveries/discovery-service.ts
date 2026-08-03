import type {
  Discovery,
  KnowledgeLibrary,
} from "@savewise/shared";

import type { DiscoveryRepository } from "../../repositories/discovery-repository";
import { buildKnowledgeLibrary } from "../library/library-builder";

export type RelatedDiscovery = {
  discovery: Discovery;
  score: number;
  reasons: string[];
};

export async function getAllDiscoveries(
  repository: DiscoveryRepository,
): Promise<Discovery[]> {
  const discoveries = await repository.getAll();

  return [...discoveries].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime(),
  );
}

export async function saveDiscovery(
  repository: DiscoveryRepository,
  discovery: Discovery,
): Promise<Discovery> {
  const existingDiscoveries =
    await repository.getAll();

  const existingIndex =
    existingDiscoveries.findIndex(
      (existingDiscovery) =>
        normalizeUrl(existingDiscovery.url) ===
        normalizeUrl(discovery.url),
    );

  if (existingIndex >= 0) {
    const existingDiscovery =
      existingDiscoveries[existingIndex];

    const updatedDiscovery: Discovery = {
      ...discovery,

      id: existingDiscovery.id,

      createdAt:
        existingDiscovery.createdAt,

      updatedAt: new Date().toISOString(),
    };

    const updatedDiscoveries = [
      ...existingDiscoveries,
    ];

    updatedDiscoveries[existingIndex] =
      updatedDiscovery;

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
  const discoveries = await repository.getAll();

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
  const discoveries = await repository.getAll();

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
    await getAllDiscoveries(repository);

  return buildKnowledgeLibrary(discoveries);
}

export async function getDiscoveriesForInterest(
  repository: DiscoveryRepository,
  interestId: string,
  limit = 50,
): Promise<Discovery[]> {
  const discoveries =
    await getAllDiscoveries(repository);

  const normalizedInterest =
    normalizeText(interestId);

  return discoveries
    .filter((discovery) => {
      const topic =
        discovery.classification?.topic ??
        discovery.topics[0] ??
        "";

      return (
        createSlug(topic) === normalizedInterest ||
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
  const discoveries =
    await getAllDiscoveries(repository);

  const sourceDiscovery =
    discoveries.find(
      (discovery) =>
        discovery.id === discoveryId,
    );

  if (!sourceDiscovery) {
    return [];
  }

  return discoveries
    .filter(
      (discovery) =>
        discovery.id !== discoveryId,
    )
    .map((discovery) =>
      calculateRelation(
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
        second.score - first.score,
    )
    .slice(0, limit);
}

function calculateRelation(
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
    candidate.classification?.topic ??
    candidate.topics[0] ??
    "";

  if (
    normalizeText(sourceTopic) &&
    normalizeText(sourceTopic) ===
      normalizeText(candidateTopic)
  ) {
    score += 0.5;

    reasons.push(
      `Gleiches Thema: ${sourceTopic}`,
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
    sourceCategory === candidateCategory
  ) {
    score += 0.15;

    reasons.push(
      `Gleiche Kategorie: ${sourceCategory}`,
    );
  }

  const sharedKeywords =
    findSharedValues(
      source.keywords,
      candidate.keywords,
    );

  if (sharedKeywords.length > 0) {
    const maximumKeywordCount = Math.max(
      source.keywords.length,
      candidate.keywords.length,
      1,
    );

    score +=
      (sharedKeywords.length /
        maximumKeywordCount) *
      0.35;

    reasons.push(
      `Gemeinsame Keywords: ${sharedKeywords.join(
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
      Math.min(1, score).toFixed(4),
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
      secondValues.map(normalizeText),
    );

  return firstValues.filter((value) =>
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
    const normalizedUrl = new URL(url);

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
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "uncategorized";
}