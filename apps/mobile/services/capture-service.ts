import type { CapturedItem } from "@/types/captured-item";
import type { Discovery } from "@/types/discovery";

export function createDiscoveryFromCapture(
  capturedItem: CapturedItem,
): Discovery {
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

    category: undefined,
    topics: ["New"],
    keywords: [],

    savedAtLabel: "Just now",
  };
}