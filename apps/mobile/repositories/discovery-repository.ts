import type { Discovery } from "@/types/discovery";

export interface DiscoveryRepository {
  getAll(): Promise<Discovery[]>;

  refresh(): Promise<Discovery[]>;

  importFromUrl(
    url: string,
    preferredKnowledgePath?: string[],
  ): Promise<Discovery>;

  delete(
    discoveryId: string,
  ): Promise<void>;
}
