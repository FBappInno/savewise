import type {
  Discovery,
} from "@savewise/shared";

import type {
  DiscoveryRepository,
} from "./discovery-repository";

export class InMemoryDiscoveryRepository
  implements DiscoveryRepository
{
  constructor(
    private readonly discoveries: Discovery[],
  ) {}

  async getAll(): Promise<Discovery[]> {
    return this.discoveries;
  }
}