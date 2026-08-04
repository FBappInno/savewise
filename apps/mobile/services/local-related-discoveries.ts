import type {
  Discovery,
} from "@/types/discovery";

export type LocalRelatedDiscovery = {
  discovery: Discovery;
  score: number;
  reasons: string[];
};

export function findLocalRelatedDiscoveries(
  sourceDiscovery: Discovery,
  discoveries: Discovery[],
  limit = 5,
): LocalRelatedDiscovery[] {
  return discoveries
    .filter(
      (candidate) =>
        candidate.id !==
        sourceDiscovery.id,
    )
    .map((candidate) =>
      calculateRelation(
        sourceDiscovery,
        candidate,
      ),
    )
    .filter(
      (
        result,
      ): result is LocalRelatedDiscovery =>
        result !== null,
    )
    .sort(
      (first, second) =>
        second.score -
        first.score,
    )
    .slice(0, limit);
}

function calculateRelation(
  source: Discovery,
  candidate: Discovery,
): LocalRelatedDiscovery | null {
  let score = 0;

  const reasons: string[] =
    [];

  const sourceClassification =
    source.classification;

  const candidateClassification =
    candidate.classification;

  if (
    sourceClassification &&
    candidateClassification
  ) {
    if (
      normalize(
        sourceClassification.topic,
      ) ===
      normalize(
        candidateClassification.topic,
      )
    ) {
      score += 0.45;

      reasons.push(
        `Same topic: ${sourceClassification.topic}`,
      );
    }

    if (
      normalize(
        sourceClassification
          .secondaryCategory,
      ) ===
      normalize(
        candidateClassification
          .secondaryCategory,
      )
    ) {
      score += 0.2;

      reasons.push(
        `Same knowledge area: ${sourceClassification.secondaryCategory}`,
      );
    }

    if (
      sourceClassification
        .primaryCategory ===
      candidateClassification
        .primaryCategory
    ) {
      score += 0.1;

      reasons.push(
        `Same category: ${sourceClassification.primaryCategory}`,
      );
    }

    const sharedSubtopics =
      findSharedValues(
        sourceClassification.subtopics,
        candidateClassification.subtopics,
      );

    if (
      sharedSubtopics.length > 0
    ) {
      score += Math.min(
        0.15,
        sharedSubtopics.length *
          0.05,
      );

      reasons.push(
        `Shared subtopics: ${sharedSubtopics.join(
          ", ",
        )}`,
      );
    }
  }

  const sharedKeywords =
    findSharedValues(
      source.keywords,
      candidate.keywords,
    );

  if (
    sharedKeywords.length > 0
  ) {
    const maximumKeywordCount =
      Math.max(
        source.keywords.length,
        candidate.keywords.length,
        1,
      );

    score += Math.min(
      0.3,
      (sharedKeywords.length /
        maximumKeywordCount) *
        0.3,
    );

    reasons.push(
      `Shared keywords: ${sharedKeywords.join(
        ", ",
      )}`,
    );
  }

  const sharedTopics =
    findSharedValues(
      source.topics,
      candidate.topics,
    );

  if (
    sharedTopics.length > 0
  ) {
    score += Math.min(
      0.2,
      sharedTopics.length *
        0.05,
    );

    reasons.push(
      `Shared topics: ${sharedTopics.join(
        ", ",
      )}`,
    );
  }

  if (score <= 0) {
    return null;
  }

  return {
    discovery:
      candidate,

    score:
      Number(
        Math.min(
          1,
          score,
        ).toFixed(4),
      ),

    reasons:
      uniqueStrings(
        reasons,
      ),
  };
}

function findSharedValues(
  firstValues: string[],
  secondValues: string[],
): string[] {
  const secondValueMap =
    new Map(
      secondValues.map(
        (value) => [
          normalize(value),
          value,
        ],
      ),
    );

  const result: string[] =
    [];

  for (
    const value of firstValues
  ) {
    const normalizedValue =
      normalize(value);

    if (
      normalizedValue &&
      secondValueMap.has(
        normalizedValue,
      )
    ) {
      result.push(
        value,
      );
    }
  }

  return uniqueStrings(
    result,
  );
}

function normalize(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase();
}

function uniqueStrings(
  values: string[],
): string[] {
  const result: string[] =
    [];

  const seen =
    new Set<string>();

  for (const value of values) {
    const normalizedValue =
      normalize(value);

    if (
      !normalizedValue ||
      seen.has(normalizedValue)
    ) {
      continue;
    }

    seen.add(
      normalizedValue,
    );

    result.push(
      value.trim(),
    );
  }

  return result;
}