import {
  deleteDiscovery,
  getDiscoveries,
  importContent,
} from "@/services/content-import-client";
import {
  loadCachedDiscoveries,
  saveCachedDiscoveries,
} from "@/services/discovery-cache";
import type { Discovery } from "@/types/discovery";

import type { DiscoveryRepository } from "./discovery-repository";

export class ApiDiscoveryRepository
  implements DiscoveryRepository
{
  async getAll(): Promise<Discovery[]> {
    const cachedDiscoveries =
      await loadCachedDiscoveries();

    try {
      return await this.refresh();
    } catch (error) {
      console.warn(
        "Backend unavailable. Using cached discoveries.",
        error,
      );

      return cachedDiscoveries;
    }
  }

  async refresh(): Promise<Discovery[]> {
    const response =
      await getDiscoveries();

    const discoveries =
      sortDiscoveries(
        response.discoveries,
      );

    await saveCachedDiscoveries(
      discoveries,
    );

    return discoveries;
  }

  async importFromUrl(
    url: string,
  ): Promise<Discovery> {
    const response =
      await importContent(url);

    const currentDiscoveries =
      await loadCachedDiscoveries();

    const updatedDiscoveries =
      sortDiscoveries([
        response.discovery,
        ...currentDiscoveries.filter(
          (discovery) =>
            discovery.id !==
            response.discovery.id,
        ),
      ]);

    await saveCachedDiscoveries(
      updatedDiscoveries,
    );

    return response.discovery;
  }

  async delete(
    discoveryId: string,
  ): Promise<void> {
    await deleteDiscovery(
      discoveryId,
    );

    const currentDiscoveries =
      await loadCachedDiscoveries();

    await saveCachedDiscoveries(
      currentDiscoveries.filter(
        (discovery) =>
          discovery.id !== discoveryId,
      ),
    );
  }
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

export const apiDiscoveryRepository =
  new ApiDiscoveryRepository();