import type {
  Discovery,
} from "@/types/discovery";

import {
  getDiscoveryHierarchy,
} from "@/utils/knowledge-hierarchy";

export type DiscoverySearchResult = {
  discovery: Discovery;
  score: number;
  matchedFields: string[];
};

type SearchField = {
  name: string;
  text: string;
  weight: number;
};

const SYNONYM_GROUPS: string[][] = [
  [
    "ki",
    "ai",
    "künstliche intelligenz",
    "artificial intelligence",
    "machine learning",
  ],

  [
    "brandschutz",
    "feuerschutz",
    "feuerwehr",
    "brandbekämpfung",
    "löschen",
    "feuerlöscher",
  ],

  [
    "finanzen",
    "finance",
    "börse",
    "aktien",
    "investment",
    "investieren",
  ],

  [
    "verteidigung",
    "defense",
    "defence",
    "militär",
    "sicherheit",
  ],

  [
    "robotik",
    "robotics",
    "roboter",
    "robot",
    "automation",
  ],

  [
    "radar",
    "sensorik",
    "sensor",
    "aufklärung",
    "erkennung",
  ],

  [
    "unternehmen",
    "firma",
    "company",
    "startup",
    "geschäft",
    "business",
  ],

  [
    "gesundheit",
    "health",
    "medizin",
    "medical",
  ],
];

export function searchDiscoveries(
  discoveries: Discovery[],
  rawQuery: string,
  maximumResults = 8,
): DiscoverySearchResult[] {
  const normalizedQuery =
    normalizeSearchText(
      rawQuery,
    );

  if (
    normalizedQuery.length < 2
  ) {
    return [];
  }

  const queryTokens =
    expandQueryTokens(
      normalizedQuery,
    );

  return discoveries
    .map((discovery) =>
      scoreDiscovery(
        discovery,
        normalizedQuery,
        queryTokens,
      ),
    )
    .filter(
      (
        result,
      ): result is DiscoverySearchResult =>
        result !== null,
    )
    .sort(
      (first, second) =>
        second.score -
        first.score,
    )
    .slice(
      0,
      maximumResults,
    );
}

function scoreDiscovery(
  discovery: Discovery,
  normalizedQuery: string,
  queryTokens: string[],
): DiscoverySearchResult | null {
  const hierarchy =
    getDiscoveryHierarchy(
      discovery,
    );

  const fields: SearchField[] = [
    {
      name: "Titel",
      text:
        discovery.improvedTitle ||
        discovery.title,
      weight: 12,
    },

    {
      name: "Originaltitel",
      text:
        discovery.title,
      weight: 8,
    },

    {
      name: "Domäne",
      text:
        hierarchy.domain,
      weight: 11,
    },

    {
      name: "Topic",
      text:
        hierarchy.topic,
      weight: 10,
    },

    {
      name: "Unterthema",
      text:
        hierarchy.subtopics.join(
          " ",
        ),
      weight: 9,
    },

    {
      name: "Zusammenfassung",
      text:
        discovery.summary ?? "",
      weight: 5,
    },

    {
      name: "Autor",
      text:
        discovery.author ?? "",
      weight: 4,
    },

    {
      name: "Quelle",
      text: [
        discovery.source,
        discovery.url,
      ].join(" "),
      weight: 2,
    },
  ];

  let totalScore = 0;

  const matchedFields =
    new Set<string>();

  fields.forEach((field) => {
    const normalizedField =
      normalizeSearchText(
        field.text,
      );

    if (!normalizedField) {
      return;
    }

    const fieldScore =
      scoreField(
        normalizedField,
        normalizedQuery,
        queryTokens,
      );

    if (fieldScore <= 0) {
      return;
    }

    totalScore +=
      fieldScore *
      field.weight;

    matchedFields.add(
      field.name,
    );
  });

  if (totalScore <= 0) {
    return null;
  }

  return {
    discovery,
    score:
      Math.round(
        totalScore * 100,
      ) / 100,

    matchedFields: [
      ...matchedFields,
    ],
  };
}

function scoreField(
  fieldText: string,
  fullQuery: string,
  queryTokens: string[],
): number {
  let score = 0;

  if (fieldText === fullQuery) {
    score += 18;
  } else if (
    fieldText.startsWith(
      fullQuery,
    )
  ) {
    score += 12;
  } else if (
    fieldText.includes(
      fullQuery,
    )
  ) {
    score += 9;
  }

  const fieldTokens =
    tokenize(
      fieldText,
    );

  queryTokens.forEach(
    (queryToken) => {
      const directMatch =
        fieldTokens.some(
          (fieldToken) =>
            fieldToken ===
            queryToken,
        );

      if (directMatch) {
        score += 5;
        return;
      }

      const prefixMatch =
        fieldTokens.some(
          (fieldToken) =>
            fieldToken.startsWith(
              queryToken,
            ) ||
            queryToken.startsWith(
              fieldToken,
            ),
        );

      if (prefixMatch) {
        score += 3;
        return;
      }

      const fuzzyMatch =
        fieldTokens.some(
          (fieldToken) =>
            isFuzzyMatch(
              queryToken,
              fieldToken,
            ),
        );

      if (fuzzyMatch) {
        score += 1.5;
      }
    },
  );

  return score;
}

function expandQueryTokens(
  normalizedQuery: string,
): string[] {
  const tokens =
    new Set(
      tokenize(
        normalizedQuery,
      ),
    );

  SYNONYM_GROUPS.forEach(
    (group) => {
      const normalizedGroup =
        group.map(
          normalizeSearchText,
        );

      const matchesGroup =
        normalizedGroup.some(
          (entry) =>
            normalizedQuery.includes(
              entry,
            ) ||
            tokens.has(entry),
        );

      if (!matchesGroup) {
        return;
      }

      normalizedGroup.forEach(
        (entry) => {
          tokenize(
            entry,
          ).forEach(
            (token) => {
              tokens.add(token);
            },
          );
        },
      );
    },
  );

  return [
    ...tokens,
  ].filter(
    (token) =>
      token.length >= 2,
  );
}

function tokenize(
  value: string,
): string[] {
  return value
    .split(
      /[^a-z0-9äöüß]+/i,
    )
    .map(
      (token) =>
        token.trim(),
    )
    .filter(Boolean);
}

function isFuzzyMatch(
  first: string,
  second: string,
): boolean {
  if (
    first.length < 4 ||
    second.length < 4
  ) {
    return false;
  }

  const maximumDistance =
    Math.max(
      first.length,
      second.length,
    ) >= 8
      ? 2
      : 1;

  return (
    levenshteinDistance(
      first,
      second,
      maximumDistance,
    ) <= maximumDistance
  );
}

function levenshteinDistance(
  first: string,
  second: string,
  maximumDistance: number,
): number {
  if (
    Math.abs(
      first.length -
      second.length,
    ) > maximumDistance
  ) {
    return (
      maximumDistance + 1
    );
  }

  const previous =
    Array.from(
      {
        length:
          second.length + 1,
      },
      (
        _,
        index,
      ) => index,
    );

  for (
    let firstIndex = 1;
    firstIndex <=
      first.length;
    firstIndex += 1
  ) {
    const current: number[] =
      [firstIndex];

    let smallestValue =
      current[0];

    for (
      let secondIndex = 1;
      secondIndex <=
        second.length;
      secondIndex += 1
    ) {
      const substitutionCost =
        first[
          firstIndex - 1
        ] ===
        second[
          secondIndex - 1
        ]
          ? 0
          : 1;

      const value =
        Math.min(
          current[
            secondIndex - 1
          ] + 1,

          previous[
            secondIndex
          ] + 1,

          previous[
            secondIndex - 1
          ] +
            substitutionCost,
        );

      current.push(value);

      smallestValue =
        Math.min(
          smallestValue,
          value,
        );
    }

    if (
      smallestValue >
      maximumDistance
    ) {
      return (
        maximumDistance + 1
      );
    }

    previous.splice(
      0,
      previous.length,
      ...current,
    );
  }

  return previous[
    second.length
  ];
}

export function normalizeSearchText(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLocaleLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}