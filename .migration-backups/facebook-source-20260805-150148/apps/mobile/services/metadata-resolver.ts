import { detectSource } from "@/services/source-detector";
import type { DiscoverySource } from "@/types/discovery";

export type ResolvedMetadata = {
  title: string;
  source: DiscoverySource;

  description?: string;
  thumbnailUrl?: string;
  author?: string;
  publishedAt?: string;
};

export function resolveMetadata(url: string): ResolvedMetadata {
  const source = detectSource(url);

  switch (source) {
    case "youtube":
      return {
        title: "YouTube Video",
        source,
        description: undefined,
        thumbnailUrl: undefined,
        author: undefined,
        publishedAt: undefined,
      };

    case "instagram":
      return {
        title: "Instagram Post",
        source,
        description: undefined,
        thumbnailUrl: undefined,
        author: undefined,
        publishedAt: undefined,
      };

    case "tiktok":
      return {
        title: "TikTok Video",
        source,
        description: undefined,
        thumbnailUrl: undefined,
        author: undefined,
        publishedAt: undefined,
      };

    default:
      return {
        title: "Website",
        source: "web",
        description: undefined,
        thumbnailUrl: undefined,
        author: undefined,
        publishedAt: undefined,
      };
  }
}