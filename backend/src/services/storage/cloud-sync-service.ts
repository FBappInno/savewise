import { randomUUID } from "node:crypto";

import type {
  Discovery,
  PortableSyncBundle,
  SyncImportResult,
} from "@savewise/shared";

import type { DiscoveryRepository } from "../../repositories/discovery-repository";
import { canonicalizeDiscoveryUrl } from "../../utils/discovery-url";

export async function createPortableSyncBundle(
  repository: DiscoveryRepository,
  installationId: string | undefined,
): Promise<PortableSyncBundle> {
  const discoveries = await repository.getAll();
  const { getOrBuildKnowledgeGraph } = await import("../knowledge/knowledge-graph-service");
  const knowledgeGraph = await getOrBuildKnowledgeGraph(discoveries);

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    sourceInstallationId: installationId?.trim() || randomUUID(),
    discoveries,
    knowledgeGraph,
  };
}

export async function mergePortableSyncBundle(
  repository: DiscoveryRepository,
  bundle: PortableSyncBundle,
): Promise<SyncImportResult> {
  const current = await repository.getAll();
  const byIdentity = new Map<string, Discovery>();

  for (const discovery of current) {
    byIdentity.set(discoveryIdentity(discovery), discovery);
  }

  let addedDiscoveries = 0;
  let updatedDiscoveries = 0;

  for (const incoming of bundle.discoveries) {
    const identity = discoveryIdentity(incoming);
    const existing = byIdentity.get(identity);
    if (!existing) {
      byIdentity.set(identity, incoming);
      addedDiscoveries += 1;
      continue;
    }

    if (new Date(incoming.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
      byIdentity.set(identity, {
        ...incoming,
        id: existing.id,
        createdAt: earliestDate(existing.createdAt, incoming.createdAt),
      });
      updatedDiscoveries += 1;
    }
  }

  const merged = [...byIdentity.values()].sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  await repository.saveAll(merged);

  return {
    importedAt: new Date().toISOString(),
    receivedDiscoveries: bundle.discoveries.length,
    totalDiscoveries: merged.length,
    addedDiscoveries,
    updatedDiscoveries,
  };
}

function discoveryIdentity(discovery: Discovery): string {
  const canonicalUrl = canonicalizeDiscoveryUrl(discovery.url);
  return canonicalUrl ? `url:${canonicalUrl}` : `id:${discovery.id}`;
}

function earliestDate(first: string, second: string): string {
  return new Date(first).getTime() <= new Date(second).getTime() ? first : second;
}
