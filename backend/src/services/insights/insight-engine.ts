import type {
  Discovery,
  Insight,
  Interest,
  KnowledgeActivity,
  Relation,
  Topic,
} from "@savewise/shared";

type InsightEngineInput = {
  discoveries: Discovery[];
  topics: Topic[];
  interests: Interest[];
  relations: Relation[];
  generatedAt: string;
};

type EmergingTopicInsight = Insight & {
  kind: "emerging-topic";
};

export function buildInsights({
  discoveries,
  topics,
  interests,
  relations,
  generatedAt,
}: InsightEngineInput): Insight[] {
  const insights: Insight[] = [];

  const dominantInterestInsight =
    buildDominantInterestInsight(
      discoveries,
      interests,
      generatedAt,
    );

  if (dominantInterestInsight) {
    insights.push(
      dominantInterestInsight,
    );
  }

  const recentActivityInsight =
    buildRecentActivityInsight(
      discoveries,
      generatedAt,
    );

  if (recentActivityInsight) {
    insights.push(
      recentActivityInsight,
    );
  }

  insights.push(
    ...buildEmergingTopicInsights(
      discoveries,
      topics,
      generatedAt,
    ),
  );

  const connectedTopicsInsight =
    buildConnectedTopicsInsight(
      discoveries,
      topics,
      relations,
      generatedAt,
    );

  if (connectedTopicsInsight) {
    insights.push(
      connectedTopicsInsight,
    );
  }

  insights.push(
    ...buildKnowledgeGapInsights(
      discoveries,
      topics,
      generatedAt,
    ),
  );

  return insights
    .sort(
      (first, second) =>
        second.score - first.score,
    )
    .slice(0, 12);
}

export function buildKnowledgeActivity(
  discoveries: Discovery[],
  topics: Topic[],
  generatedAt: string,
): KnowledgeActivity {
  const now = parseDate(generatedAt);

  const last7Days = discoveries.filter(
    (discovery) =>
      isWithinDays(
        discovery.createdAt,
        now,
        7,
      ),
  ).length;

  const last30Days = discoveries.filter(
    (discovery) =>
      isWithinDays(
        discovery.createdAt,
        now,
        30,
      ),
  ).length;

  const newTopicsLast30Days =
    topics.filter((topic) => {
      const topicDiscoveries =
        getDiscoveriesForTopic(
          discoveries,
          topic.id,
        );

      if (
        topicDiscoveries.length === 0
      ) {
        return false;
      }

      return topicDiscoveries.every(
        (discovery) =>
          isWithinDays(
            discovery.createdAt,
            now,
            30,
          ),
      );
    }).length;

  return {
    totalDiscoveries:
      discoveries.length,

    last7Days,

    last30Days,

    newTopicsLast30Days,
  };
}

function buildDominantInterestInsight(
  discoveries: Discovery[],
  interests: Interest[],
  generatedAt: string,
): Insight | null {
  const strongestInterest =
    interests[0];

  if (!strongestInterest) {
    return null;
  }

  const relatedDiscoveries =
    getDiscoveriesForTopic(
      discoveries,
      strongestInterest.id,
    );

  const score = Number(
    Math.min(
      1,
      strongestInterest.score,
    ).toFixed(4),
  );

  return {
    id: `dominant-interest-${strongestInterest.id}`,

    kind: "dominant-interest",

    title:
      `${strongestInterest.name} is currently your strongest interest`,

    description:
      strongestInterest.discoveries === 1
        ? `You currently have one discovery about ${strongestInterest.name}.`
        : `You have saved ${strongestInterest.discoveries} discoveries about ${strongestInterest.name}.`,

    score,

    topicIds: [
      strongestInterest.id,
    ],

    discoveryIds:
      relatedDiscoveries.map(
        (discovery) =>
          discovery.id,
      ),

    generatedAt,
  };
}

function buildRecentActivityInsight(
  discoveries: Discovery[],
  generatedAt: string,
): Insight | null {
  if (discoveries.length === 0) {
    return null;
  }

  const now = parseDate(generatedAt);

  const recentDiscoveries =
    discoveries.filter(
      (discovery) =>
        isWithinDays(
          discovery.createdAt,
          now,
          7,
        ),
    );

  if (
    recentDiscoveries.length === 0
  ) {
    return null;
  }

  const score = Number(
    Math.min(
      1,
      recentDiscoveries.length / 7,
    ).toFixed(4),
  );

  return {
    id: "recent-activity-7-days",

    kind: "recent-activity",

    title:
      "Your knowledge library is growing",

    description:
      recentDiscoveries.length === 1
        ? "You added one new discovery during the last seven days."
        : `You added ${recentDiscoveries.length} new discoveries during the last seven days.`,

    score,

    topicIds: uniqueStrings(
      recentDiscoveries.map(
        getDiscoveryTopicId,
      ),
    ),

    discoveryIds:
      recentDiscoveries.map(
        (discovery) =>
          discovery.id,
      ),

    generatedAt,
  };
}

function buildEmergingTopicInsights(
  discoveries: Discovery[],
  topics: Topic[],
  generatedAt: string,
): Insight[] {
  const now = parseDate(generatedAt);

  const insights: EmergingTopicInsight[] =
    [];

  for (const topic of topics) {
    const topicDiscoveries =
      getDiscoveriesForTopic(
        discoveries,
        topic.id,
      );

    const recentDiscoveries =
      topicDiscoveries.filter(
        (discovery) =>
          isWithinDays(
            discovery.createdAt,
            now,
            30,
          ),
      );

    const olderDiscoveries =
      topicDiscoveries.length -
      recentDiscoveries.length;

    if (
      recentDiscoveries.length === 0
    ) {
      continue;
    }

    const isNewTopic =
      olderDiscoveries === 0;

    const recentShare =
      recentDiscoveries.length /
      Math.max(
        topicDiscoveries.length,
        1,
      );

    if (
      !isNewTopic &&
      recentShare < 0.6
    ) {
      continue;
    }

    const score = Number(
      Math.min(
        1,
        0.5 +
          recentShare * 0.5,
      ).toFixed(4),
    );

    insights.push({
      id:
        `emerging-topic-${topic.id}`,

      kind: "emerging-topic",

      title: isNewTopic
        ? `${topic.name} is a new topic in your library`
        : `${topic.name} is gaining importance`,

      description:
        recentDiscoveries.length === 1
          ? `Your first recent discovery about ${topic.name} was added during the last 30 days.`
          : `${recentDiscoveries.length} discoveries about ${topic.name} were added during the last 30 days.`,

      score,

      topicIds: [
        topic.id,
      ],

      discoveryIds:
        recentDiscoveries.map(
          (discovery) =>
            discovery.id,
        ),

      generatedAt,
    });
  }

  return insights
    .sort(
      (first, second) =>
        second.score -
        first.score,
    )
    .slice(0, 4);
}

function buildConnectedTopicsInsight(
  discoveries: Discovery[],
  topics: Topic[],
  relations: Relation[],
  generatedAt: string,
): Insight | null {
  const strongestRelation =
    relations[0];

  if (!strongestRelation) {
    return null;
  }

  const sourceTopic =
    topics.find(
      (topic) =>
        topic.id ===
        strongestRelation.sourceId,
    );

  const targetTopic =
    topics.find(
      (topic) =>
        topic.id ===
        strongestRelation.targetId,
    );

  if (
    !sourceTopic ||
    !targetTopic
  ) {
    return null;
  }

  const discoveryIds =
    uniqueStrings([
      ...getDiscoveriesForTopic(
        discoveries,
        sourceTopic.id,
      ).map(
        (discovery) =>
          discovery.id,
      ),

      ...getDiscoveriesForTopic(
        discoveries,
        targetTopic.id,
      ).map(
        (discovery) =>
          discovery.id,
      ),
    ]);

  return {
    id:
      `connected-topics-${sourceTopic.id}-${targetTopic.id}`,

    kind: "connected-topics",

    title:
      `${sourceTopic.name} and ${targetTopic.name} are strongly connected`,

    description:
      strongestRelation.reason,

    score: Number(
      Math.min(
        1,
        strongestRelation.strength,
      ).toFixed(4),
    ),

    topicIds: [
      sourceTopic.id,
      targetTopic.id,
    ],

    discoveryIds,

    generatedAt,
  };
}

function buildKnowledgeGapInsights(
  discoveries: Discovery[],
  topics: Topic[],
  generatedAt: string,
): Insight[] {
  return topics
    .filter(
      (topic) =>
        topic.discoveries === 1,
    )
    .slice(0, 3)
    .map((topic) => {
      const topicDiscoveries =
        getDiscoveriesForTopic(
          discoveries,
          topic.id,
        );

      return {
        id:
          `knowledge-gap-${topic.id}`,

        kind:
          "knowledge-gap" as const,

        title:
          `${topic.name} currently has limited coverage`,

        description:
          "Your library contains only one discovery about this topic. Adding more sources could provide a broader perspective.",

        score: 0.35,

        topicIds: [
          topic.id,
        ],

        discoveryIds:
          topicDiscoveries.map(
            (discovery) =>
              discovery.id,
          ),

        generatedAt,
      };
    });
}

function getDiscoveriesForTopic(
  discoveries: Discovery[],
  topicId: string,
): Discovery[] {
  return discoveries.filter(
    (discovery) =>
      getDiscoveryTopicId(
        discovery,
      ) === topicId,
  );
}

function getDiscoveryTopicId(
  discovery: Discovery,
): string {
  const topicName =
    discovery.classification?.topic ||
    discovery.topics[0] ||
    "Uncategorized";

  return createSlug(topicName);
}

function isWithinDays(
  dateValue: string,
  referenceDate: Date,
  numberOfDays: number,
): boolean {
  const date = parseDate(dateValue);

  const difference =
    referenceDate.getTime() -
    date.getTime();

  const maximumDifference =
    numberOfDays *
    24 *
    60 *
    60 *
    1000;

  return (
    difference >= 0 &&
    difference <=
      maximumDifference
  );
}

function parseDate(
  value: string,
): Date {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return new Date(0);
  }

  return date;
}

function uniqueStrings(
  values: string[],
): string[] {
  return [
    ...new Set(
      values.filter(Boolean),
    ),
  ];
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

  return (
    slug || "uncategorized"
  );
}