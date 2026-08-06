import type { DiscoverySource } from "@/types/discovery";

export function detectSource(url: string): DiscoverySource {
  const normalizedUrl = url.trim().toLowerCase();

  if (
    normalizedUrl.includes("youtube.com") ||
    normalizedUrl.includes("youtu.be")
  ) {
    return "youtube";
  }

  if (normalizedUrl.includes("instagram.com")) {
    return "instagram";
  }

  if (normalizedUrl.includes("tiktok.com")) {
    return "tiktok";
  }

  return "web";
}