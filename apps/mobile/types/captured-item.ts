import type { DiscoverySource } from "@/types/discovery";

export type CapturedItem = {
  id: string;
  title: string;
  url: string;
  source: DiscoverySource;
  capturedAt: string;
  preferredKnowledgePath?: string[];
};
