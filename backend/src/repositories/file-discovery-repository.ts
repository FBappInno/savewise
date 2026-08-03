import type { Discovery } from "@savewise/shared";

import {
  loadDiscoveries,
  saveDiscoveries,
} from "../persistence/discoveries/discovery-store";
import type { DiscoveryRepository } from "./discovery-repository";

export class FileDiscoveryRepository
  implements DiscoveryRepository
{
  async getAll(): Promise<Discovery[]> {
    return loadDiscoveries();
  }

  async saveAll(
    discoveries: Discovery[],
  ): Promise<void> {
    await saveDiscoveries(discoveries);
  }
}