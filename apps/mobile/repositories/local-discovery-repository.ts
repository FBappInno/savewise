import {
  loadDiscoveries,
  saveDiscoveries,
} from "@/services/discovery-storage";
import type { Discovery } from "@/types/discovery";
import type { DiscoveryRepository } from "./discovery-repository";

export const localDiscoveryRepository: DiscoveryRepository = {
  async getAll() {
    return loadDiscoveries();
  },

  async saveAll(discoveries) {
    return saveDiscoveries(discoveries);
  },

  async update(updatedDiscovery: Discovery) {
    const discoveries = await loadDiscoveries();

    const updated = discoveries.map((discovery) =>
      discovery.id === updatedDiscovery.id
        ? {
            ...updatedDiscovery,
            updatedAt: new Date().toISOString(),
          }
        : discovery,
    );

    await saveDiscoveries(updated);
  },
};