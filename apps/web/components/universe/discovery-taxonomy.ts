import type {
  Discovery,
} from "@savewise/shared";

export type DiscoveryTaxonomy = {
  galaxy: string;
  planet: string;
  stars: string[];
};

export function getDiscoveryTaxonomy(
  discovery: Discovery,
): DiscoveryTaxonomy {
  return {
    galaxy:
      discovery.classification
        ?.secondaryCategory
        ?.trim() ??
      "",

    planet:
      discovery.classification
        ?.topic
        ?.trim() ??
      "",

    stars:
      discovery.classification
        ?.subtopics
        ?.map(
          (subtopic) =>
            subtopic.trim(),
        )
        .filter(Boolean) ??
      [],
  };
}
