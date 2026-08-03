import { getAllDiscoveries } from "../repositories/discoveryRepository.js";
import {
  getKnowledgeLibrary,
  saveKnowledgeLibrary,
} from "../repositories/knowledgeLibraryRepository.js";

const RELATION_THRESHOLD = 0.18;
const MAX_RELATIONS_PER_DISCOVERY = 8;

const FIELD_WEIGHTS = {
  primaryCategory: 5,
  secondaryCategory: 3,
  topic: 6,
  subtopic: 4,
  keyword: 2,
  language: 0.25,
};

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

function toDisplayLabel(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

function uniqueStrings(values) {
  return [
    ...new Set(
      values
        .filter((value) => typeof value === "string")
        .map((value) => toDisplayLabel(value))
        .filter(Boolean)
    ),
  ];
}

function getAnalysis(discovery) {
  /*
   * Unterstützt beide möglichen Strukturen:
   *
   * discovery.analysis.primaryCategory
   *
   * und:
   *
   * discovery.primaryCategory
   */
  return discovery.analysis ?? discovery.aiAnalysis ?? discovery;
}

function prepareDiscovery(discovery) {
  const analysis = getAnalysis(discovery);

  const primaryCategory = toDisplayLabel(analysis.primaryCategory);
  const secondaryCategory = toDisplayLabel(analysis.secondaryCategory);
  const topic = toDisplayLabel(analysis.topic);
  const subtopics = uniqueStrings(analysis.subtopics ?? []);
  const keywords = uniqueStrings(analysis.keywords ?? []);
  const language = toDisplayLabel(analysis.language);

  return {
    id: discovery.id,
    title:
      analysis.improvedTitle ||
      discovery.title ||
      discovery.metadata?.title ||
      "Unbenannte Discovery",
    summary: analysis.summary || discovery.summary || "",
    url: discovery.url || discovery.originalUrl || "",
    createdAt:
      discovery.createdAt ||
      discovery.savedAt ||
      discovery.updatedAt ||
      new Date(0).toISOString(),
    primaryCategory,
    secondaryCategory,
    topic,
    subtopics,
    keywords,
    language,
    confidence: Number(analysis.confidence) || 0,
  };
}

function addToCounter(counter, rawValue, weight = 1, discoveryId = null) {
  const normalizedValue = normalizeText(rawValue);

  if (!normalizedValue) {
    return;
  }

  if (!counter.has(normalizedValue)) {
    counter.set(normalizedValue, {
      key: normalizedValue,
      label: toDisplayLabel(rawValue),
      count: 0,
      score: 0,
      discoveryIds: new Set(),
    });
  }

  const entry = counter.get(normalizedValue);

  entry.count += 1;
  entry.score += weight;

  if (discoveryId) {
    entry.discoveryIds.add(discoveryId);
  }
}

function serializeCounter(counter, limit = null) {
  const entries = [...counter.values()]
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      count: entry.count,
      score: Number(entry.score.toFixed(2)),
      discoveryIds: [...entry.discoveryIds],
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return b.count - a.count;
    });

  return typeof limit === "number" ? entries.slice(0, limit) : entries;
}

function buildFeatureMap(discovery) {
  const features = new Map();

  function setFeature(type, rawValue, weight) {
    const normalizedValue = normalizeText(rawValue);

    if (!normalizedValue) {
      return;
    }

    features.set(`${type}:${normalizedValue}`, weight);
  }

  setFeature(
    "primaryCategory",
    discovery.primaryCategory,
    FIELD_WEIGHTS.primaryCategory
  );

  setFeature(
    "secondaryCategory",
    discovery.secondaryCategory,
    FIELD_WEIGHTS.secondaryCategory
  );

  setFeature("topic", discovery.topic, FIELD_WEIGHTS.topic);
  setFeature("language", discovery.language, FIELD_WEIGHTS.language);

  for (const subtopic of discovery.subtopics) {
    setFeature("subtopic", subtopic, FIELD_WEIGHTS.subtopic);
  }

  for (const keyword of discovery.keywords) {
    setFeature("keyword", keyword, FIELD_WEIGHTS.keyword);
  }

  return features;
}

function weightedJaccardSimilarity(firstFeatures, secondFeatures) {
  const allKeys = new Set([
    ...firstFeatures.keys(),
    ...secondFeatures.keys(),
  ]);

  let intersection = 0;
  let union = 0;

  for (const key of allKeys) {
    const firstWeight = firstFeatures.get(key) ?? 0;
    const secondWeight = secondFeatures.get(key) ?? 0;

    intersection += Math.min(firstWeight, secondWeight);
    union += Math.max(firstWeight, secondWeight);
  }

  if (union === 0) {
    return 0;
  }

  return intersection / union;
}

function findSharedFeatures(firstDiscovery, secondDiscovery) {
  const shared = [];

  const comparisons = [
    {
      type: "primaryCategory",
      first: firstDiscovery.primaryCategory,
      second: secondDiscovery.primaryCategory,
    },
    {
      type: "secondaryCategory",
      first: firstDiscovery.secondaryCategory,
      second: secondDiscovery.secondaryCategory,
    },
    {
      type: "topic",
      first: firstDiscovery.topic,
      second: secondDiscovery.topic,
    },
  ];

  for (const comparison of comparisons) {
    if (
      normalizeText(comparison.first) &&
      normalizeText(comparison.first) === normalizeText(comparison.second)
    ) {
      shared.push({
        type: comparison.type,
        value: comparison.first,
      });
    }
  }

  const secondSubtopics = new Set(
    secondDiscovery.subtopics.map(normalizeText)
  );

  for (const subtopic of firstDiscovery.subtopics) {
    if (secondSubtopics.has(normalizeText(subtopic))) {
      shared.push({
        type: "subtopic",
        value: subtopic,
      });
    }
  }

  const secondKeywords = new Set(
    secondDiscovery.keywords.map(normalizeText)
  );

  for (const keyword of firstDiscovery.keywords) {
    if (secondKeywords.has(normalizeText(keyword))) {
      shared.push({
        type: "keyword",
        value: keyword,
      });
    }
  }

  return shared.slice(0, 8);
}

function buildRelations(discoveries) {
  const featureMaps = new Map(
    discoveries.map((discovery) => [
      discovery.id,
      buildFeatureMap(discovery),
    ])
  );

  const relations = {};

  for (const discovery of discoveries) {
    relations[discovery.id] = [];
  }

  for (let firstIndex = 0; firstIndex < discoveries.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < discoveries.length;
      secondIndex += 1
    ) {
      const firstDiscovery = discoveries[firstIndex];
      const secondDiscovery = discoveries[secondIndex];

      const score = weightedJaccardSimilarity(
        featureMaps.get(firstDiscovery.id),
        featureMaps.get(secondDiscovery.id)
      );

      if (score < RELATION_THRESHOLD) {
        continue;
      }

      const sharedFeatures = findSharedFeatures(
        firstDiscovery,
        secondDiscovery
      );

      relations[firstDiscovery.id].push({
        discoveryId: secondDiscovery.id,
        score: Number(score.toFixed(4)),
        sharedFeatures,
      });

      relations[secondDiscovery.id].push({
        discoveryId: firstDiscovery.id,
        score: Number(score.toFixed(4)),
        sharedFeatures,
      });
    }
  }

  for (const discoveryId of Object.keys(relations)) {
    relations[discoveryId] = relations[discoveryId]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RELATIONS_PER_DISCOVERY);
  }

  return relations;
}

function differenceInDays(firstDate, secondDate) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.floor(
    Math.abs(firstDate.getTime() - secondDate.getTime()) /
      millisecondsPerDay
  );
}

function getTimeWeight(createdAt, now = new Date()) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return 0.25;
  }

  const ageInDays = differenceInDays(now, date);

  if (ageInDays <= 7) {
    return 1;
  }

  if (ageInDays <= 30) {
    return 0.7;
  }

  if (ageInDays <= 90) {
    return 0.4;
  }

  return 0.2;
}

function buildInterests(discoveries) {
  const interestCounter = new Map();

  for (const discovery of discoveries) {
    const recencyWeight = getTimeWeight(discovery.createdAt);
    const confidenceWeight =
      discovery.confidence > 0 ? discovery.confidence : 0.75;

    const baseMultiplier = recencyWeight * confidenceWeight;

    addToCounter(
      interestCounter,
      discovery.primaryCategory,
      FIELD_WEIGHTS.primaryCategory * baseMultiplier,
      discovery.id
    );

    addToCounter(
      interestCounter,
      discovery.secondaryCategory,
      FIELD_WEIGHTS.secondaryCategory * baseMultiplier,
      discovery.id
    );

    addToCounter(
      interestCounter,
      discovery.topic,
      FIELD_WEIGHTS.topic * baseMultiplier,
      discovery.id
    );

    for (const subtopic of discovery.subtopics) {
      addToCounter(
        interestCounter,
        subtopic,
        FIELD_WEIGHTS.subtopic * baseMultiplier,
        discovery.id
      );
    }

    for (const keyword of discovery.keywords) {
      addToCounter(
        interestCounter,
        keyword,
        FIELD_WEIGHTS.keyword * baseMultiplier,
        discovery.id
      );
    }
  }

  const interests = serializeCounter(interestCounter, 30);
  const maximumScore = interests[0]?.score || 1;

  return interests.map((interest, index) => ({
    ...interest,
    rank: index + 1,
    strength: Number((interest.score / maximumScore).toFixed(4)),
  }));
}

function buildGroups(discoveries) {
  const categoryCounter = new Map();
  const topicCounter = new Map();
  const keywordCounter = new Map();

  for (const discovery of discoveries) {
    addToCounter(
      categoryCounter,
      discovery.primaryCategory,
      1,
      discovery.id
    );

    addToCounter(
      categoryCounter,
      discovery.secondaryCategory,
      0.6,
      discovery.id
    );

    addToCounter(topicCounter, discovery.topic, 1, discovery.id);

    for (const subtopic of discovery.subtopics) {
      addToCounter(topicCounter, subtopic, 0.6, discovery.id);
    }

    for (const keyword of discovery.keywords) {
      addToCounter(keywordCounter, keyword, 1, discovery.id);
    }
  }

  return {
    categories: serializeCounter(categoryCounter),
    topics: serializeCounter(topicCounter),
    keywordCloud: serializeCounter(keywordCounter, 100),
  };
}

function buildTrends(discoveries) {
  const now = new Date();
  const currentPeriodStart = new Date(now);
  currentPeriodStart.setDate(now.getDate() - 14);

  const previousPeriodStart = new Date(now);
  previousPeriodStart.setDate(now.getDate() - 28);

  const trendMap = new Map();

  function addTrendValue(rawValue, period) {
    const key = normalizeText(rawValue);

    if (!key) {
      return;
    }

    if (!trendMap.has(key)) {
      trendMap.set(key, {
        key,
        label: toDisplayLabel(rawValue),
        currentCount: 0,
        previousCount: 0,
        discoveryIds: new Set(),
      });
    }

    const trend = trendMap.get(key);

    if (period === "current") {
      trend.currentCount += 1;
    } else {
      trend.previousCount += 1;
    }
  }

  for (const discovery of discoveries) {
    const createdAt = new Date(discovery.createdAt);

    if (Number.isNaN(createdAt.getTime())) {
      continue;
    }

    let period = null;

    if (createdAt >= currentPeriodStart) {
      period = "current";
    } else if (
      createdAt >= previousPeriodStart &&
      createdAt < currentPeriodStart
    ) {
      period = "previous";
    }

    if (!period) {
      continue;
    }

    const values = uniqueStrings([
      discovery.primaryCategory,
      discovery.secondaryCategory,
      discovery.topic,
      ...discovery.subtopics,
      ...discovery.keywords,
    ]);

    for (const value of values) {
      addTrendValue(value, period);

      if (period === "current") {
        trendMap.get(normalizeText(value)).discoveryIds.add(discovery.id);
      }
    }
  }

  return [...trendMap.values()]
    .map((trend) => {
      const absoluteGrowth =
        trend.currentCount - trend.previousCount;

      const growthRate =
        trend.previousCount === 0
          ? trend.currentCount > 0
            ? 1
            : 0
          : absoluteGrowth / trend.previousCount;

      /*
       * Ein einmalig vorkommendes neues Keyword soll nicht automatisch
       * zum stärksten Trend werden. Deshalb werden Häufigkeit und Wachstum
       * gemeinsam berücksichtigt.
       */
      const trendScore =
        trend.currentCount * 2 +
        Math.max(0, absoluteGrowth) * 1.5 +
        Math.max(0, growthRate);

      return {
        key: trend.key,
        label: trend.label,
        currentCount: trend.currentCount,
        previousCount: trend.previousCount,
        absoluteGrowth,
        growthRate: Number(growthRate.toFixed(4)),
        score: Number(trendScore.toFixed(4)),
        discoveryIds: [...trend.discoveryIds],
      };
    })
    .filter(
      (trend) =>
        trend.currentCount >= 2 &&
        trend.absoluteGrowth > 0
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

function countRelations(relations) {
  const relationEntries = Object.values(relations);
  const directedRelationCount = relationEntries.reduce(
    (sum, items) => sum + items.length,
    0
  );

  /*
   * Jede Beziehung steht bei beiden Discoveries.
   */
  return Math.floor(directedRelationCount / 2);
}

export async function rebuildKnowledgeLibrary() {
  const rawDiscoveries = await getAllDiscoveries();
  const discoveries = rawDiscoveries.map(prepareDiscovery);

  const interests = buildInterests(discoveries);
  const groups = buildGroups(discoveries);
  const relations = buildRelations(discoveries);
  const trends = buildTrends(discoveries);

  const library = {
    generatedAt: new Date().toISOString(),

    statistics: {
      totalDiscoveries: discoveries.length,
      totalCategories: groups.categories.length,
      totalTopics: groups.topics.length,
      totalKeywords: groups.keywordCloud.length,
      totalRelations: countRelations(relations),
    },

    interests,
    categories: groups.categories,
    topics: groups.topics,
    keywordCloud: groups.keywordCloud,
    trends,
    relations,
  };

  await saveKnowledgeLibrary(library);

  return library;
}

export async function readKnowledgeLibrary({
  rebuildWhenEmpty = true,
} = {}) {
  const library = await getKnowledgeLibrary();

  if (
    rebuildWhenEmpty &&
    (!library.generatedAt ||
      library.statistics?.totalDiscoveries === 0)
  ) {
    return rebuildKnowledgeLibrary();
  }

  return library;
}

export async function getRelatedDiscoveries(
  discoveryId,
  { limit = 5 } = {}
) {
  const [library, rawDiscoveries] = await Promise.all([
    readKnowledgeLibrary(),
    getAllDiscoveries(),
  ]);

  const relatedRelations =
    library.relations?.[discoveryId]?.slice(0, limit) ?? [];

  const discoveriesById = new Map(
    rawDiscoveries.map((discovery) => [
      discovery.id,
      discovery,
    ])
  );

  return relatedRelations
    .map((relation) => {
      const discovery = discoveriesById.get(relation.discoveryId);

      if (!discovery) {
        return null;
      }

      return {
        discovery,
        relation: {
          score: relation.score,
          sharedFeatures: relation.sharedFeatures,
        },
      };
    })
    .filter(Boolean);
}

export async function getDiscoveriesForInterest(
  interestKey,
  { limit = 50 } = {}
) {
  const [library, rawDiscoveries] = await Promise.all([
    readKnowledgeLibrary(),
    getAllDiscoveries(),
  ]);

  const normalizedInterestKey = normalizeText(interestKey);

  const interest = library.interests.find(
    (entry) => entry.key === normalizedInterestKey
  );

  if (!interest) {
    return {
      interest: null,
      discoveries: [],
    };
  }

  const discoveryIds = new Set(interest.discoveryIds);

  const discoveries = rawDiscoveries
    .filter((discovery) => discoveryIds.has(discovery.id))
    .slice(0, limit);

  return {
    interest,
    discoveries,
  };
}