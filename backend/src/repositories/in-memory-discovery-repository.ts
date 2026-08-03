import type { Discovery } from "@savewise/shared";

import type { DiscoveryRepository } from "./discovery-repository";

export class InMemoryDiscoveryRepository
  implements DiscoveryRepository
{
  constructor(
    private discoveries: Discovery[] = [],
  ) {}

  async getAll(): Promise<Discovery[]> {
    return [...this.discoveries];
  }

  async saveAll(
    discoveries: Discovery[],
  ): Promise<void> {
    this.discoveries = [...discoveries];
  }
}