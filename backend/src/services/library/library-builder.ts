import type {
  Discovery,
  Interest,
  KnowledgeLibrary,
  KnowledgeNode,
  Relation,
  Topic,
} from "@savewise/shared";

import {
  buildInsights,
  buildKnowledgeActivity,
} from "../insights/insight-engine";

type TopicAccumulator = {
  topic: Topic;
  discoveryIds: string[];
};

export function buildKnowledgeLibrary(
  discoveries: Discovery[],
): KnowledgeLibrary {
  const generatedAt =
    new Date().toISOString();

  const topicAccumulators =
    buildTopicAccumulators(
      discoveries,
    );

  const topics =
    topicAccumulators.map(
      ({ topic }) => topic,
    );

  const interests =
    buildInterests(topics);

  const nodes =
    buildKnowledgeNodes(
      topicAccumulators,
    );

  const relations =
    buildRelations(topics);

  const insights =
    buildInsights({
      discoveries,
      topics,
      interests,
      relations,
      generatedAt,
    });

  const activity =
    buildKnowledgeActivity(
      discoveries,
      topics,
      generatedAt,
    );

  return {
    generatedAt,
    discoveries,
    topics,
    interests,
    nodes,
    relations,
    insights,
    activity,

    graph: null,
  };
}

function buildTopicAccumulators(
  discoveries: Discovery[],
): TopicAccumulator[] {
  const map = new Map<
    string,
    TopicAccumulator
  >();

  for (const discovery of discoveries) {
    const topicName =
      discovery.classification
        ?.topic.trim() ||
      discovery.topics[0]?.trim() ||
      "Uncategorized";

    const topicId =
      createSlug(topicName);

    let accumulator =
      map.get(topicId);

    if (!accumulator) {
      accumulator = {
        topic: {
          id: topicId,
          name: topicName,
          discoveries: 0,
          keywords: [],
        },

        discoveryIds: [],
      };

      map.set(
        topicId,
        accumulator,
      );
    }

    accumulator.topic.discoveries +=
      1;

    if (
      !accumulator.discoveryIds.includes(
        discovery.id,
      )
    ) {
      accumulator.discoveryIds.push(
        discovery.id,
      );
    }

    for (
      const keyword of
        discovery.keywords
    ) {
      addUniqueKeyword(
        accumulator.topic.keywords,
        keyword,
      );
    }
  }

  return [
    ...map.values(),
  ].sort(
    (first, second) =>
      second.topic.discoveries -
      first.topic.discoveries,
  );
}

function buildInterests(
  topics: Topic[],
): Interest[] {
  const highestDiscoveryCount =
    topics[0]?.discoveries ?? 0;

  return topics.map(
    (topic) => ({
      id: topic.id,
      name: topic.name,
      discoveries:
        topic.discoveries,

      score:
        highestDiscoveryCount === 0
          ? 0
          : Number(
              (
                topic.discoveries /
                highestDiscoveryCount
              ).toFixed(4),
            ),
    }),
  );
}

function buildKnowledgeNodes(
  topics: TopicAccumulator[],
): KnowledgeNode[] {
  return topics.map(
    ({
      topic,
      discoveryIds,
    }) => ({
      id: topic.id,
      title: topic.name,
      category: "topic",
      kind: "topic",
      parentId: null,
      discoveries: [
        ...discoveryIds,
      ],
      children: [],
      keywords: [
        ...topic.keywords,
      ],
    }),
  );
}

function buildRelations(
  topics: Topic[],
): Relation[] {
  const relations: Relation[] =
    [];

  for (
    let firstIndex = 0;
    firstIndex <
    topics.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex =
        firstIndex + 1;
      secondIndex <
      topics.length;
      secondIndex += 1
    ) {
      const firstTopic =
        topics[firstIndex];

      const secondTopic =
        topics[secondIndex];

      const sharedKeywords =
        findSharedKeywords(
          firstTopic.keywords,
          secondTopic.keywords,
        );

      if (
        sharedKeywords.length === 0
      ) {
        continue;
      }

      const allKeywords =
        new Set([
          ...firstTopic.keywords.map(
            normalizeText,
          ),

          ...secondTopic.keywords.map(
            normalizeText,
          ),
        ]);

      const strength =
        allKeywords.size === 0
          ? 0
          : sharedKeywords.length /
            allKeywords.size;

      relations.push({
        sourceId:
          firstTopic.id,

        targetId:
          secondTopic.id,

        kind: "related",

        strength: Number(
          strength.toFixed(4),
        ),

        reason:
          `Shared keywords: ${sharedKeywords.join(
            ", ",
          )}`,

        evidenceDiscoveryIds: [],
      });
    }
  }

  return relations.sort(
    (first, second) =>
      second.strength -
      first.strength,
  );
}

function findSharedKeywords(
  firstKeywords: string[],
  secondKeywords: string[],
): string[] {
  const secondKeywordMap =
    new Map(
      secondKeywords.map(
        (keyword) => [
          normalizeText(keyword),
          keyword,
        ],
      ),
    );

  const sharedKeywords:
    string[] = [];

  for (
    const keyword of
      firstKeywords
  ) {
    const normalizedKeyword =
      normalizeText(keyword);

    if (
      normalizedKeyword &&
      secondKeywordMap.has(
        normalizedKeyword,
      )
    ) {
      sharedKeywords.push(
        keyword,
      );
    }
  }

  return sharedKeywords;
}

function addUniqueKeyword(
  target: string[],
  rawKeyword: string,
): void {
  const keyword =
    rawKeyword.trim();

  if (!keyword) {
    return;
  }

  const normalizedKeyword =
    normalizeText(keyword);

  const alreadyExists =
    target.some(
      (existingKeyword) =>
        normalizeText(
          existingKeyword,
        ) === normalizedKeyword,
    );

  if (!alreadyExists) {
    target.push(keyword);
  }
}

function createSlug(
  value: string,
): string {
  const slug = value
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );

  return slug || "uncategorized";
}

function normalizeText(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase();
}