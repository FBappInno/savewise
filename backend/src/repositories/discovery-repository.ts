import type { Discovery } from "@savewise/shared";

export interface DiscoveryRepository {
  getAll(): Promise<Discovery[]>;
}