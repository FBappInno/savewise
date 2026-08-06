import {
  deleteDiscovery,
  getDiscoveries,
  importContent,
  updateDiscovery,
} from "@/services/content-import-client";
import { migrateDiscoveryCacheToSQLite } from "@/services/discovery-cache-migration";
import { sqliteDiscoveryRepository } from "@/repositories/sqlite-discovery-repository";
import type {
  Discovery,
  DiscoveryUpdate,
} from "@/types/discovery";

import type { DiscoveryRepository } from "./discovery-repository";

export class HybridDiscoveryRepository
  implements DiscoveryRepository
{
  private initializationPromise:
    | Promise<void>
    | null = null;

  async getAll(): Promise<Discovery[]> {
    await this.initialize();

    return sqliteDiscoveryRepository.getAll();
  }

  async getById(
    discoveryId: string,
  ): Promise<Discovery | null> {
    await this.initialize();

    const localDiscovery =
      await sqliteDiscoveryRepository.getById(
        discoveryId,
      );

    if (localDiscovery) {
      return localDiscovery;
    }

    return null;
  }

  async refresh(): Promise<Discovery[]> {
    await this.initialize();

    try {
      const response =
        await getDiscoveries();

      const discoveries =
        sortDiscoveries(
          response.discoveries,
        );

      await sqliteDiscoveryRepository.replaceAll(
        discoveries,
      );

      return discoveries;
    } catch (error) {
      const localDiscoveries =
        await sqliteDiscoveryRepository.getAll();

      if (localDiscoveries.length > 0) {
        console.warn(
          "Backend unavailable. Using local SQLite discoveries.",
          error,
        );

        return localDiscoveries;
      }

      throw error;
    }
  }

  async importFromUrl(
    url: string,
    preferredKnowledgePath?: string[],
  ): Promise<Discovery> {
    await this.initialize();

    const response =
      await importContent(
        url,
        preferredKnowledgePath,
      );

    await sqliteDiscoveryRepository.save(
      response.discovery,
      "synced",
    );

    return response.discovery;
  }

  async update(
    discoveryId: string,
    update: DiscoveryUpdate,
  ): Promise<Discovery> {
    await this.initialize();

    const existingDiscovery =
      await sqliteDiscoveryRepository.getById(
        discoveryId,
      );

    if (!existingDiscovery) {
      throw new Error(
        "Die Discovery wurde lokal nicht gefunden.",
      );
    }

    const locallyUpdatedDiscovery =
      applyDiscoveryUpdate(
        existingDiscovery,
        update,
      );

    await sqliteDiscoveryRepository.save(
      locallyUpdatedDiscovery,
      "pending-update",
    );

    try {
      const response =
        await updateDiscovery(
          discoveryId,
          update,
        );

      await sqliteDiscoveryRepository.save(
        response.discovery,
        "synced",
      );

      return response.discovery;
    } catch (error) {
      console.warn(
        "Discovery was updated locally. Remote synchronization will be retried later.",
        error,
      );

      return locallyUpdatedDiscovery;
    }
  }

  async delete(
    discoveryId: string,
  ): Promise<void> {
    await this.initialize();

    const existingDiscovery =
      await sqliteDiscoveryRepository.getById(
        discoveryId,
      );

    if (!existingDiscovery) {
      return;
    }

    await sqliteDiscoveryRepository.markPendingDelete(
      discoveryId,
    );

    try {
      await deleteDiscovery(
        discoveryId,
      );

      await sqliteDiscoveryRepository.delete(
        discoveryId,
      );
    } catch (error) {
      console.warn(
        "Discovery was deleted locally. Remote synchronization will be retried later.",
        error,
      );
    }
  }

  private async initialize(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise =
        migrateDiscoveryCacheToSQLite();
    }

    await this.initializationPromise;
  }
}

function applyDiscoveryUpdate(
  discovery: Discovery,
  update: DiscoveryUpdate,
): Discovery {
  const classification =
    discovery.classification
      ? {
          ...discovery.classification,
          ...(update.classification ?? {}),
        }
      : update.classification;

  return {
    ...discovery,
    ...update,
    classification,
    updatedAt:
      new Date().toISOString(),
  };
}

function sortDiscoveries(
  discoveries: Discovery[],
): Discovery[] {
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

export const hybridDiscoveryRepository =
  new HybridDiscoveryRepository();