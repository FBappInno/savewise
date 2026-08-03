import type { CapturedItem } from "@/types/captured-item";
import type { Discovery } from "@/types/discovery";

export function createDiscoveryFromCapture(
  capturedItem: CapturedItem,
): Discovery {
  const now = new Date().toISOString();

  return {
    id: capturedItem.id,
    title: capturedItem.title,
    source: capturedItem.source,
    url: capturedItem.url,

    description: undefined,
    summary: undefined,

    thumbnailUrl: undefined,
    author: undefined,
    publishedAt: undefined,

    classification: undefined,

    keywords: [],
    language: undefined,
    confidence: undefined,

    topics: ["New"],

    createdAt: now,
    updatedAt: now,

    savedAtLabel: "Just now",
  };
}