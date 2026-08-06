import type {
  Discovery,
  DiscoveryClassification,
} from "@/types/discovery";

export type KnowledgeHierarchy = {
  domain: string;
  topic: string;
  subtopics: string[];
};

export type KnowledgeHierarchyUpdate = {
  domain?: string;
  topic?: string;
  subtopics?: string[];
};

const GENERIC_DOMAIN_NAMES =
  new Set([
    "other",
    "others",
    "general",
    "miscellaneous",
    "misc",
    "unknown",
    "uncategorized",
    "unclassified",
    "sonstiges",
    "andere",
    "allgemein",
    "noch nicht eingeordnet",
    "nicht eingeordnet",
  ]);

export function getDiscoveryHierarchy(
  discovery: Discovery,
): KnowledgeHierarchy {
  return getClassificationHierarchy(
    discovery.classification,
  );
}

export function getClassificationHierarchy(
  classification:
    | DiscoveryClassification
    | null
    | undefined,
): KnowledgeHierarchy {
  if (!classification) {
    return {
      domain: "",
      topic: "",
      subtopics: [],
    };
  }

  const domain =
    normalizeHierarchyValue(
      classification.secondaryCategory,
    );

  const topic =
    normalizeHierarchyValue(
      classification.topic,
    );

  const subtopics =
    normalizeHierarchyValues(
      classification.subtopics,
    );

  return {
    domain:
      isGenericDomain(domain)
        ? ""
        : domain,

    topic,

    subtopics,
  };
}

export function applyHierarchyToClassification(
  classification:
    DiscoveryClassification,
  update:
    KnowledgeHierarchyUpdate,
): DiscoveryClassification {
  const current =
    getClassificationHierarchy(
      classification,
    );

  const domain =
    update.domain === undefined
      ? current.domain
      : normalizeHierarchyValue(
          update.domain,
        );

  const topic =
    update.topic === undefined
      ? current.topic
      : normalizeHierarchyValue(
          update.topic,
        );

  const subtopics =
    update.subtopics === undefined
      ? current.subtopics
      : normalizeHierarchyValues(
          update.subtopics,
        );

  return {
    ...classification,

    /*
     * primaryCategory bleibt eine interne KI-Kategorie.
     * Sie ist kein Bestandteil der sichtbaren Hierarchie.
     */

    secondaryCategory:
      domain,

    topic,

    subtopics,
  };
}

export function buildExistingDomains(
  discoveries: Discovery[],
): string[] {
  const domains =
    new Map<string, string>();

  discoveries.forEach(
    (discovery) => {
      const {
        domain,
      } =
        getDiscoveryHierarchy(
          discovery,
        );

      if (!domain) {
        return;
      }

      const key =
        domain.toLocaleLowerCase();

      if (!domains.has(key)) {
        domains.set(
          key,
          domain,
        );
      }
    },
  );

  return sortHierarchyValues(
    [...domains.values()],
  );
}

export function buildExistingTopics(
  discoveries: Discovery[],
  domain?: string,
): string[] {
  const normalizedDomain =
    normalizeHierarchyValue(
      domain ?? "",
    );

  const topics =
    new Map<string, string>();

  discoveries.forEach(
    (discovery) => {
      const hierarchy =
        getDiscoveryHierarchy(
          discovery,
        );

      if (
        normalizedDomain &&
        hierarchy.domain
          .toLocaleLowerCase() !==
          normalizedDomain
            .toLocaleLowerCase()
      ) {
        return;
      }

      if (!hierarchy.topic) {
        return;
      }

      const key =
        hierarchy.topic
          .toLocaleLowerCase();

      if (!topics.has(key)) {
        topics.set(
          key,
          hierarchy.topic,
        );
      }
    },
  );

  return sortHierarchyValues(
    [...topics.values()],
  );
}

export function buildExistingSubtopics(
  discoveries: Discovery[],
  domain?: string,
  topic?: string,
): string[] {
  const normalizedDomain =
    normalizeHierarchyValue(
      domain ?? "",
    );

  const normalizedTopic =
    normalizeHierarchyValue(
      topic ?? "",
    );

  const subtopics =
    new Map<string, string>();

  discoveries.forEach(
    (discovery) => {
      const hierarchy =
        getDiscoveryHierarchy(
          discovery,
        );

      if (
        normalizedDomain &&
        hierarchy.domain
          .toLocaleLowerCase() !==
          normalizedDomain
            .toLocaleLowerCase()
      ) {
        return;
      }

      if (
        normalizedTopic &&
        hierarchy.topic
          .toLocaleLowerCase() !==
          normalizedTopic
            .toLocaleLowerCase()
      ) {
        return;
      }

      hierarchy.subtopics.forEach(
        (subtopic) => {
          const key =
            subtopic
              .toLocaleLowerCase();

          if (!subtopics.has(key)) {
            subtopics.set(
              key,
              subtopic,
            );
          }
        },
      );
    },
  );

  return sortHierarchyValues(
    [...subtopics.values()],
  );
}

export function buildKnowledgePath(
  discovery: Discovery,
): string[] {
  const hierarchy =
    getDiscoveryHierarchy(
      discovery,
    );

  return [
    hierarchy.domain,
    hierarchy.topic,
    ...hierarchy.subtopics,
  ]
    .filter(Boolean)
    .slice(0, 3);
}

export function formatKnowledgePath(
  discovery: Discovery,
): string {
  return buildKnowledgePath(
    discovery,
  ).join(" › ");
}

export function isGenericDomain(
  value: string,
): boolean {
  const normalized =
    normalizeHierarchyKey(
      value,
    );

  return GENERIC_DOMAIN_NAMES.has(
    normalized,
  );
}

export function normalizeHierarchyValue(
  value:
    | string
    | null
    | undefined,
): string {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function normalizeHierarchyValues(
  values:
    | string[]
    | null
    | undefined,
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const unique =
    new Map<string, string>();

  values.forEach((value) => {
    const normalized =
      normalizeHierarchyValue(
        value,
      );

    if (!normalized) {
      return;
    }

    const key =
      normalized
        .toLocaleLowerCase();

    if (!unique.has(key)) {
      unique.set(
        key,
        normalized,
      );
    }
  });

  return sortHierarchyValues(
    [...unique.values()],
  );
}

function normalizeHierarchyKey(
  value: string,
): string {
  return normalizeHierarchyValue(
    value,
  )
    .toLocaleLowerCase()
    .replace(
      /[\s_-]+/g,
      " ",
    );
}

function sortHierarchyValues(
  values: string[],
): string[] {
  return [...values].sort(
    (first, second) =>
      first.localeCompare(
        second,
        undefined,
        {
          sensitivity: "base",
        },
      ),
  );
}