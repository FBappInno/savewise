import type {
  Discovery,
  DiscoveryUpdate,
} from "@/types/discovery";

export interface DiscoveryRepository {
  getAll(): Promise<Discovery[]>;

  getById(
    discoveryId: string,
  ): Promise<Discovery | null>;

  refresh(): Promise<Discovery[]>;

  importFromUrl(
    url: string,
    preferredKnowledgePath?: string[],
  ): Promise<Discovery>;

  update(
    discoveryId: string,
    update: DiscoveryUpdate,
  ): Promise<Discovery>;

  delete(
    discoveryId: string,
  ): Promise<void>;
}