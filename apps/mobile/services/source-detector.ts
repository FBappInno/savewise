import type { DiscoverySource } from "@/types/discovery";

export function detectSource(
  rawUrl: string,
): DiscoverySource {
  try {
    const normalizedUrl =
      /^https?:\/\//i.test(
        rawUrl.trim(),
      )
        ? rawUrl.trim()
        : `https://${rawUrl.trim()}`;

    const hostname =
      new URL(normalizedUrl)
        .hostname
        .toLowerCase()
        .replace(/^www\./, "");

    if (
      hostname === "youtube.com" ||
      hostname.endsWith(
        ".youtube.com",
      ) ||
      hostname === "youtu.be"
    ) {
      return "youtube";
    }

    if (
      hostname === "instagram.com" ||
      hostname.endsWith(
        ".instagram.com",
      ) ||
      hostname === "ig.me"
    ) {
      return "instagram";
    }

    if (
      hostname === "facebook.com" ||
      hostname.endsWith(
        ".facebook.com",
      ) ||
      hostname === "fb.com" ||
      hostname.endsWith(
        ".fb.com",
      ) ||
      hostname === "fb.watch"
    ) {
      return "facebook";
    }

    if (
      hostname === "tiktok.com" ||
      hostname.endsWith(
        ".tiktok.com",
      )
    ) {
      return "tiktok";
    }

    return "web";
  } catch {
    return "web";
  }
}
