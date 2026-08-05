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

export function resolveMetadata(
  url: string,
): ResolvedMetadata {
  const source = detectSource(url);

  switch (source) {
    case "youtube":
      return {
        title: "YouTube Video",
        source,
      };

    case "instagram":
      return {
        title: "Instagram Beitrag",
        source,
      };

    case "facebook":
      return {
        title: "Facebook Beitrag",
        source,
      };

    case "tiktok":
      return {
        title: "TikTok Video",
        source,
      };

    case "web":
    default:
      return {
        title: "Website",
        source: "web",
      };
  }
}
