import type { Discovery } from "@/types/discovery";

export type DiscoveryRepository = {
  getAll(): Promise<Discovery[]>;

  saveAll(
    discoveries: Discovery[],
  ): Promise<void>;

  update(
    discovery: Discovery,
  ): Promise<void>;
};