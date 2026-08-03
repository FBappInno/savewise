import type { Discovery } from "@savewise/shared";

export interface DiscoveryRepository {
  getAll(): Promise<Discovery[]>;

  saveAll(
    discoveries: Discovery[],
  ): Promise<void>;
}