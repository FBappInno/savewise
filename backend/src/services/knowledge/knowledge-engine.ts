import { promises as fs } from "node:fs";
import path from "node:path";

type RawDiscovery = {
  id?: string;
  url?: string;
  title?: string;
  improvedTitle?: string;
  summary?: string;
  primaryCategory?: string;
  secondaryCategory?: string;
  topic?: string;
  subtopics?: string[];
  keywords?: string[];
  language?: string;
  confidence?: number;
  createdAt?: string;
  updatedAt?: string;
  savedAt?: string;

  analysis?: Partial<RawDiscovery>;
  aiAnalysis?: Partial<RawDiscovery>;
  metadata?: {
    title?: string;
    [key: string]: unknown;
  };

  [key: string]: unknown;
};

type PreparedDiscovery = {
  id: string;
  title: string;
  summary: string;
  url: string;
  createdAt: string;
  primaryCategory: string;
  secondaryCategory: string;
  topic: string;
  subtopics: string[];
  keywords: string[];
  language: string;
  confidence: number;
};

type CounterEntry = {
  key: string;
  label: string;
  count: number;
  score: number;
  discoveryIds: Set<string>;
};

type SerializedCounterEntry = {
  key: string;
  label: string;
  count: number;
  score: number;
  discoveryIds: string[];
};

type SharedFeature = {
  type:
    | "primaryCategory"
    | "secondaryCategory"
    | "topic"
    | "subtopic"
    | "keyword";
  value: string;
};

type DiscoveryRelation = {
  discoveryId: string;
  score: number;
  sharedFeatures: SharedFeature[];
};

type InterestEntry = SerializedCounterEntry & {
  rank: number;
  strength: number;
};

type TrendEntry = {
  key: string;
  label: string;
  currentCount: number;
  previousCount: number;
  absoluteGrowth: number;
  growthRate: number;
  score: number;
  discoveryIds: string[];
};

export type KnowledgeLibrary = {
  generatedAt: string | null;

  statistics: {
    totalDiscoveries: number;
    totalCategories: number;
    totalTopics: number;
    totalKeywords: number;
    totalRelations: number;
  };

  interests: InterestEntry[];
  categories: SerializedCounterEntry[];
  topics: SerializedCounterEntry[];
  keywordCloud: SerializedCounterEntry[];
  trends: TrendEntry[];
  relations: Record<string, DiscoveryRelation[]>;
};

const DATA_DIRECTORY = path.resolve(
  process.cwd(),
  "backend",
  "data",
);

const ALTERNATIVE_DATA_DIRECTORY = path.resolve(
  process.cwd(),
  "data",
);

const KNOWLEDGE_LIBRARY_FILENAME =
  "knowledge-library.json";

const DISCOVERY_FILE_CANDIDATES = [
  "discoveries.json",
  "discoveries-store.json",
  "saved-discoveries.json",
];

const RELATION_THRESHOLD = 0.18;
const MAX_RELATIONS_PER_DISCOVERY = 8;

const FIELD_WEIGHTS = {
  primaryCategory: 5,
  secondaryCategory: 3,
  topic: 6,
  subtopic: 4,
  keyword: 2,
  language: 0.25,
} as const;

const EMPTY_LIBRARY: KnowledgeLibrary = {
  generatedAt: null,

  statistics: {
    totalDiscoveries: 0,
    totalCategories: 0,
    totalTopics: 0,
    totalKeywords: 0,
    totalRelations: 0,
  },

  interests: [],
  categories: [],
  topics: [],
  keywordCloud: [],
  trends: [],
  relations: {},
};

function normalizeText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

function toDisplayLabel(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

function uniqueStrings(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const normalizedValues = values
    .filter(
      (value): value is string =>
        typeof value === "string",
    )
    .map((value) => toDisplayLabel(value))
    .filter(Boolean);

  return [...new Set(normalizedValues)];
}

function getString(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string"
    ? value
    : fallback;
}

function getNumber(
  value: unknown,
  fallback = 0,
): number {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : fallback;
}

function getDiscoveryAnalysis(
  discovery: RawDiscovery,
): Partial<RawDiscovery> {
  if (
    discovery.analysis &&
    typeof discovery.analysis === "object"
  ) {
    return discovery.analysis;
  }

  if (
    discovery.aiAnalysis &&
    typeof discovery.aiAnalysis === "object"
  ) {
    return discovery.aiAnalysis;
  }

  return discovery;
}

function prepareDiscovery(
  discovery: RawDiscovery,
  index: number,
): PreparedDiscovery {
  const analysis = getDiscoveryAnalysis(discovery);

  const fallbackId = `discovery-${index + 1}`;

  const id =
    getString(discovery.id).trim() || fallbackId;

  const title =
    toDisplayLabel(analysis.improvedTitle) ||
    toDisplayLabel(discovery.improvedTitle) ||
    toDisplayLabel(discovery.title) ||
    toDisplayLabel(discovery.metadata?.title) ||
    "Unbenannte Discovery";

  const createdAt =
    getString(discovery.createdAt) ||
    getString(discovery.savedAt) ||
    getString(discovery.updatedAt) ||
    new Date(0).toISOString();

  return {
    id,
    title,

    summary:
      getString(analysis.summary) ||
      getString(discovery.summary),

    url: getString(discovery.url),

    createdAt,

    primaryCategory:
      toDisplayLabel(analysis.primaryCategory) ||
      toDisplayLabel(discovery.primaryCategory),

    secondaryCategory:
      toDisplayLabel(analysis.secondaryCategory) ||
      toDisplayLabel(discovery.secondaryCategory),

    topic:
      toDisplayLabel(analysis.topic) ||
      toDisplayLabel(discovery.topic),

    subtopics: uniqueStrings(
      analysis.subtopics ?? discovery.subtopics,
    ),

    keywords: uniqueStrings(
      analysis.keywords ?? discovery.keywords,
    ),

    language:
      toDisplayLabel(analysis.language) ||
      toDisplayLabel(discovery.language),

    confidence: Math.max(
      0,
      Math.min(
        1,
        getNumber(
          analysis.confidence ??
            discovery.confidence,
          0,
        ),
      ),
    ),
  };
}

function getPossibleDataDirectories(): string[] {
  return [
    process.env.SAVEWISE_DATA_DIRECTORY
      ? path.resolve(
          process.env.SAVEWISE_DATA_DIRECTORY,
        )
      : null,
    DATA_DIRECTORY,
    ALTERNATIVE_DATA_DIRECTORY,
  ].filter(
    (directory): directory is string =>
      Boolean(directory),
  );
}

async function fileExists(
  filePath: string,
): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getWritableDataDirectory(): Promise<string> {
  const directories = getPossibleDataDirectories();

  for (const directory of directories) {
    if (await fileExists(directory)) {
      return directory;
    }
  }

  const directory = directories[0];

  await fs.mkdir(directory, {
    recursive: true,
  });

  return directory;
}

async function findDiscoveriesFile(): Promise<string> {
  const configuredFile =
    process.env.SAVEWISE_DISCOVERIES_FILE;

  if (configuredFile) {
    return path.resolve(configuredFile);
  }

  const directories = getPossibleDataDirectories();

  for (const directory of directories) {
    for (const filename of DISCOVERY_FILE_CANDIDATES) {
      const candidate = path.join(
        directory,
        filename,
      );

      if (await fileExists(candidate)) {
        return candidate;
      }
    }
  }

  const dataDirectory =
    await getWritableDataDirectory();

  const defaultPath = path.join(
    dataDirectory,
    "discoveries.json",
  );

  await fs.writeFile(defaultPath, "[]", "utf8");

  return defaultPath;
}

async function getKnowledgeLibraryFile(): Promise<string> {
  const configuredFile =
    process.env.SAVEWISE_KNOWLEDGE_FILE;

  if (configuredFile) {
    return path.resolve(configuredFile);
  }

  const dataDirectory =
    await getWritableDataDirectory();

  return path.join(
    dataDirectory,
    KNOWLEDGE_LIBRARY_FILENAME,
  );
}

function extractDiscoveries(
  parsedData: unknown,
): RawDiscovery[] {
  if (Array.isArray(parsedData)) {
    return parsedData.filter(
      (item): item is RawDiscovery =>
        Boolean(item) &&
        typeof item === "object",
    );
  }

  if (
    parsedData &&
    typeof parsedData === "object"
  ) {
    const possibleContainer = parsedData as {
      discoveries?: unknown;
      items?: unknown;
      data?: unknown;
    };

    if (Array.isArray(possibleContainer.discoveries)) {
      return possibleContainer.discoveries.filter(
        (item): item is RawDiscovery =>
          Boolean(item) &&
          typeof item === "object",
      );
    }

    if (Array.isArray(possibleContainer.items)) {
      return possibleContainer.items.filter(
        (item): item is RawDiscovery =>
          Boolean(item) &&
          typeof item === "object",
      );
    }

    if (Array.isArray(possibleContainer.data)) {
      return possibleContainer.data.filter(
        (item): item is RawDiscovery =>
          Boolean(item) &&
          typeof item === "object",
      );
    }
  }

  return [];
}

async function readDiscoveries(): Promise<
  RawDiscovery[]
> {
  const discoveriesFile =
    await findDiscoveriesFile();

  try {
    const fileContent = await fs.readFile(
      discoveriesFile,
      "utf8",
    );

    if (!fileContent.trim()) {
      return [];
    }

    const parsedData: unknown =
      JSON.parse(fileContent);

    return extractDiscoveries(parsedData);
  } catch (error) {
    console.error(
      `Could not read discoveries from ${discoveriesFile}:`,
      error,
    );

    return [];
  }
}

async function saveLibrary(
  library: KnowledgeLibrary,
): Promise<void> {
  const libraryFile =
    await getKnowledgeLibraryFile();

  await fs.mkdir(path.dirname(libraryFile), {
    recursive: true,
  });

  await fs.writeFile(
    libraryFile,
    JSON.stringify(library, null, 2),
    "utf8",
  );
}

function addToCounter(
  counter: Map<string, CounterEntry>,
  rawValue: string,
  weight: number,
  discoveryId: string,
): void {
  const key = normalizeText(rawValue);

  if (!key) {
    return;
  }

  let entry = counter.get(key);

  if (!entry) {
    entry = {
      key,
      label: toDisplayLabel(rawValue),
      count: 0,
      score: 0,
      discoveryIds: new Set<string>(),
    };

    counter.set(key, entry);
  }

  entry.count += 1;
  entry.score += weight;
  entry.discoveryIds.add(discoveryId);
}

function serializeCounter(
  counter: Map<string, CounterEntry>,
  limit?: number,
): SerializedCounterEntry[] {
  const entries = [...counter.values()]
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      count: entry.count,
      score: Number(entry.score.toFixed(4)),
      discoveryIds: [...entry.discoveryIds],
    }))
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      if (second.count !== first.count) {
        return second.count - first.count;
      }

      return first.label.localeCompare(
        second.label,
      );
    });

  return typeof limit === "number"
    ? entries.slice(0, limit)
    : entries;
}

function getAgeInDays(
  createdAt: string,
  now = new Date(),
): number {
  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  const millisecondsPerDay =
    1000 * 60 * 60 * 24;

  return Math.max(
    0,
    Math.floor(
      (now.getTime() - createdDate.getTime()) /
        millisecondsPerDay,
    ),
  );
}

function getRecencyWeight(
  createdAt: string,
): number {
  const ageInDays = getAgeInDays(createdAt);

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

function buildInterests(
  discoveries: PreparedDiscovery[],
): InterestEntry[] {
  const counter = new Map<string, CounterEntry>();

  for (const discovery of discoveries) {
    const recencyWeight = getRecencyWeight(
      discovery.createdAt,
    );

    const confidenceWeight =
      discovery.confidence > 0
        ? discovery.confidence
        : 0.75;

    const multiplier =
      recencyWeight * confidenceWeight;

    addToCounter(
      counter,
      discovery.primaryCategory,
      FIELD_WEIGHTS.primaryCategory *
        multiplier,
      discovery.id,
    );

    addToCounter(
      counter,
      discovery.secondaryCategory,
      FIELD_WEIGHTS.secondaryCategory *
        multiplier,
      discovery.id,
    );

    addToCounter(
      counter,
      discovery.topic,
      FIELD_WEIGHTS.topic * multiplier,
      discovery.id,
    );

    for (const subtopic of discovery.subtopics) {
      addToCounter(
        counter,
        subtopic,
        FIELD_WEIGHTS.subtopic * multiplier,
        discovery.id,
      );
    }

    for (const keyword of discovery.keywords) {
      addToCounter(
        counter,
        keyword,
        FIELD_WEIGHTS.keyword * multiplier,
        discovery.id,
      );
    }
  }

  const interests = serializeCounter(
    counter,
    30,
  );

  const maximumScore =
    interests[0]?.score || 1;

  return interests.map((interest, index) => ({
    ...interest,
    rank: index + 1,
    strength: Number(
      (interest.score / maximumScore).toFixed(4),
    ),
  }));
}

function buildGroups(
  discoveries: PreparedDiscovery[],
): {
  categories: SerializedCounterEntry[];
  topics: SerializedCounterEntry[];
  keywordCloud: SerializedCounterEntry[];
} {
  const categories =
    new Map<string, CounterEntry>();

  const topics = new Map<string, CounterEntry>();

  const keywords =
    new Map<string, CounterEntry>();

  for (const discovery of discoveries) {
    addToCounter(
      categories,
      discovery.primaryCategory,
      1,
      discovery.id,
    );

    addToCounter(
      categories,
      discovery.secondaryCategory,
      0.6,
      discovery.id,
    );

    addToCounter(
      topics,
      discovery.topic,
      1,
      discovery.id,
    );

    for (const subtopic of discovery.subtopics) {
      addToCounter(
        topics,
        subtopic,
        0.6,
        discovery.id,
      );
    }

    for (const keyword of discovery.keywords) {
      addToCounter(
        keywords,
        keyword,
        1,
        discovery.id,
      );
    }
  }

  return {
    categories: serializeCounter(categories),
    topics: serializeCounter(topics),
    keywordCloud: serializeCounter(
      keywords,
      100,
    ),
  };
}

function buildFeatureMap(
  discovery: PreparedDiscovery,
): Map<string, number> {
  const features = new Map<string, number>();

  function addFeature(
    type: string,
    value: string,
    weight: number,
  ): void {
    const normalizedValue = normalizeText(value);

    if (!normalizedValue) {
      return;
    }

    features.set(
      `${type}:${normalizedValue}`,
      weight,
    );
  }

  addFeature(
    "primaryCategory",
    discovery.primaryCategory,
    FIELD_WEIGHTS.primaryCategory,
  );

  addFeature(
    "secondaryCategory",
    discovery.secondaryCategory,
    FIELD_WEIGHTS.secondaryCategory,
  );

  addFeature(
    "topic",
    discovery.topic,
    FIELD_WEIGHTS.topic,
  );

  addFeature(
    "language",
    discovery.language,
    FIELD_WEIGHTS.language,
  );

  for (const subtopic of discovery.subtopics) {
    addFeature(
      "subtopic",
      subtopic,
      FIELD_WEIGHTS.subtopic,
    );
  }

  for (const keyword of discovery.keywords) {
    addFeature(
      "keyword",
      keyword,
      FIELD_WEIGHTS.keyword,
    );
  }

  return features;
}

function calculateWeightedJaccard(
  firstFeatures: Map<string, number>,
  secondFeatures: Map<string, number>,
): number {
  const allKeys = new Set<string>([
    ...firstFeatures.keys(),
    ...secondFeatures.keys(),
  ]);

  let intersection = 0;
  let union = 0;

  for (const key of allKeys) {
    const firstWeight =
      firstFeatures.get(key) ?? 0;

    const secondWeight =
      secondFeatures.get(key) ?? 0;

    intersection += Math.min(
      firstWeight,
      secondWeight,
    );

    union += Math.max(
      firstWeight,
      secondWeight,
    );
  }

  return union === 0
    ? 0
    : intersection / union;
}

function findSharedFeatures(
  first: PreparedDiscovery,
  second: PreparedDiscovery,
): SharedFeature[] {
  const sharedFeatures: SharedFeature[] = [];

  function addDirectMatch(
    type:
      | "primaryCategory"
      | "secondaryCategory"
      | "topic",
    firstValue: string,
    secondValue: string,
  ): void {
    if (
      normalizeText(firstValue) &&
      normalizeText(firstValue) ===
        normalizeText(secondValue)
    ) {
      sharedFeatures.push({
        type,
        value: firstValue,
      });
    }
  }

  addDirectMatch(
    "primaryCategory",
    first.primaryCategory,
    second.primaryCategory,
  );

  addDirectMatch(
    "secondaryCategory",
    first.secondaryCategory,
    second.secondaryCategory,
  );

  addDirectMatch(
    "topic",
    first.topic,
    second.topic,
  );

  const secondSubtopics = new Set(
    second.subtopics.map(normalizeText),
  );

  for (const subtopic of first.subtopics) {
    if (
      secondSubtopics.has(
        normalizeText(subtopic),
      )
    ) {
      sharedFeatures.push({
        type: "subtopic",
        value: subtopic,
      });
    }
  }

  const secondKeywords = new Set(
    second.keywords.map(normalizeText),
  );

  for (const keyword of first.keywords) {
    if (
      secondKeywords.has(normalizeText(keyword))
    ) {
      sharedFeatures.push({
        type: "keyword",
        value: keyword,
      });
    }
  }

  return sharedFeatures.slice(0, 8);
}

function buildRelations(
  discoveries: PreparedDiscovery[],
): Record<string, DiscoveryRelation[]> {
  const relations: Record<
    string,
    DiscoveryRelation[]
  > = {};

  const featureMaps = new Map<
    string,
    Map<string, number>
  >();

  for (const discovery of discoveries) {
    relations[discovery.id] = [];

    featureMaps.set(
      discovery.id,
      buildFeatureMap(discovery),
    );
  }

  for (
    let firstIndex = 0;
    firstIndex < discoveries.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < discoveries.length;
      secondIndex += 1
    ) {
      const first = discoveries[firstIndex];
      const second = discoveries[secondIndex];

      const firstFeatures =
        featureMaps.get(first.id);

      const secondFeatures =
        featureMaps.get(second.id);

      if (!firstFeatures || !secondFeatures) {
        continue;
      }

      const score =
        calculateWeightedJaccard(
          firstFeatures,
          secondFeatures,
        );

      if (score < RELATION_THRESHOLD) {
        continue;
      }

      const sharedFeatures =
        findSharedFeatures(first, second);

      relations[first.id].push({
        discoveryId: second.id,
        score: Number(score.toFixed(4)),
        sharedFeatures,
      });

      relations[second.id].push({
        discoveryId: first.id,
        score: Number(score.toFixed(4)),
        sharedFeatures,
      });
    }
  }

  for (const discoveryId of Object.keys(
    relations,
  )) {
    relations[discoveryId] = relations[
      discoveryId
    ]
      .sort(
        (first, second) =>
          second.score - first.score,
      )
      .slice(0, MAX_RELATIONS_PER_DISCOVERY);
  }

  return relations;
}

function buildTrends(
  discoveries: PreparedDiscovery[],
): TrendEntry[] {
  const now = new Date();

  const currentPeriodStart = new Date(now);
  currentPeriodStart.setDate(
    currentPeriodStart.getDate() - 14,
  );

  const previousPeriodStart = new Date(now);
  previousPeriodStart.setDate(
    previousPeriodStart.getDate() - 28,
  );

  const trendMap = new Map<
    string,
    {
      key: string;
      label: string;
      currentCount: number;
      previousCount: number;
      discoveryIds: Set<string>;
    }
  >();

  function addValue(
    value: string,
    period: "current" | "previous",
    discoveryId: string,
  ): void {
    const key = normalizeText(value);

    if (!key) {
      return;
    }

    let entry = trendMap.get(key);

    if (!entry) {
      entry = {
        key,
        label: toDisplayLabel(value),
        currentCount: 0,
        previousCount: 0,
        discoveryIds: new Set<string>(),
      };

      trendMap.set(key, entry);
    }

    if (period === "current") {
      entry.currentCount += 1;
      entry.discoveryIds.add(discoveryId);
    } else {
      entry.previousCount += 1;
    }
  }

  for (const discovery of discoveries) {
    const createdAt = new Date(
      discovery.createdAt,
    );

    if (Number.isNaN(createdAt.getTime())) {
      continue;
    }

    let period: "current" | "previous" | null =
      null;

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

    const values = [
      discovery.primaryCategory,
      discovery.secondaryCategory,
      discovery.topic,
      ...discovery.subtopics,
      ...discovery.keywords,
    ];

    const uniqueValues = [
      ...new Set(
        values
          .map((value) =>
            toDisplayLabel(value),
          )
          .filter(Boolean),
      ),
    ];

    for (const value of uniqueValues) {
      addValue(
        value,
        period,
        discovery.id,
      );
    }
  }

  return [...trendMap.values()]
    .map((entry) => {
      const absoluteGrowth =
        entry.currentCount -
        entry.previousCount;

      const growthRate =
        entry.previousCount === 0
          ? entry.currentCount > 0
            ? 1
            : 0
          : absoluteGrowth /
            entry.previousCount;

      const score =
        entry.currentCount * 2 +
        Math.max(0, absoluteGrowth) * 1.5 +
        Math.max(0, growthRate);

      return {
        key: entry.key,
        label: entry.label,
        currentCount: entry.currentCount,
        previousCount: entry.previousCount,
        absoluteGrowth,
        growthRate: Number(
          growthRate.toFixed(4),
        ),
        score: Number(score.toFixed(4)),
        discoveryIds: [
          ...entry.discoveryIds,
        ],
      };
    })
    .filter(
      (entry) =>
        entry.currentCount >= 2 &&
        entry.absoluteGrowth > 0,
    )
    .sort(
      (first, second) =>
        second.score - first.score,
    )
    .slice(0, 20);
}

function countRelations(
  relations: Record<
    string,
    DiscoveryRelation[]
  >,
): number {
  const directedRelationCount = Object.values(
    relations,
  ).reduce(
    (total, entries) =>
      total + entries.length,
    0,
  );

  return Math.floor(
    directedRelationCount / 2,
  );
}

export async function rebuildKnowledgeLibrary(): Promise<KnowledgeLibrary> {
  const rawDiscoveries =
    await readDiscoveries();

  const discoveries = rawDiscoveries.map(
    prepareDiscovery,
  );

  const groups = buildGroups(discoveries);
  const relations = buildRelations(discoveries);

  const library: KnowledgeLibrary = {
    generatedAt: new Date().toISOString(),

    statistics: {
      totalDiscoveries:
        discoveries.length,
      totalCategories:
        groups.categories.length,
      totalTopics: groups.topics.length,
      totalKeywords:
        groups.keywordCloud.length,
      totalRelations:
        countRelations(relations),
    },

    interests: buildInterests(discoveries),
    categories: groups.categories,
    topics: groups.topics,
    keywordCloud: groups.keywordCloud,
    trends: buildTrends(discoveries),
    relations,
  };

  await saveLibrary(library);

  return library;
}

export async function readKnowledgeLibrary(): Promise<KnowledgeLibrary> {
  const libraryFile =
    await getKnowledgeLibraryFile();

  try {
    const fileContent = await fs.readFile(
      libraryFile,
      "utf8",
    );

    const parsedLibrary =
      JSON.parse(fileContent) as KnowledgeLibrary;

    if (
      !parsedLibrary ||
      typeof parsedLibrary !== "object" ||
      !parsedLibrary.generatedAt
    ) {
      return rebuildKnowledgeLibrary();
    }

    return parsedLibrary;
  } catch {
    return rebuildKnowledgeLibrary();
  }
}

export async function getRelatedDiscoveries(
  discoveryId: string,
  options: {
    limit?: number;
  } = {},
): Promise<
  Array<{
    discovery: RawDiscovery;
    relation: {
      score: number;
      sharedFeatures: SharedFeature[];
    };
  }>
> {
  const limit = Math.max(
    1,
    Math.min(options.limit ?? 5, 20),
  );

  const [library, discoveries] =
    await Promise.all([
      readKnowledgeLibrary(),
      readDiscoveries(),
    ]);

  const discoveriesById = new Map(
    discoveries.map((discovery, index) => {
      const prepared = prepareDiscovery(
        discovery,
        index,
      );

      return [prepared.id, discovery] as const;
    }),
  );

  const relations =
    library.relations[discoveryId] ?? [];

  return relations
    .slice(0, limit)
    .map((relation) => {
      const discovery =
        discoveriesById.get(
          relation.discoveryId,
        );

      if (!discovery) {
        return null;
      }

      return {
        discovery,
        relation: {
          score: relation.score,
          sharedFeatures:
            relation.sharedFeatures,
        },
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        discovery: RawDiscovery;
        relation: {
          score: number;
          sharedFeatures: SharedFeature[];
        };
      } => entry !== null,
    );
}

export async function getDiscoveriesForInterest(
  interestKey: string,
  options: {
    limit?: number;
  } = {},
): Promise<{
  interest: InterestEntry | null;
  discoveries: RawDiscovery[];
}> {
  const limit = Math.max(
    1,
    Math.min(options.limit ?? 50, 100),
  );

  const normalizedInterestKey =
    normalizeText(interestKey);

  const [library, discoveries] =
    await Promise.all([
      readKnowledgeLibrary(),
      readDiscoveries(),
    ]);

  const interest =
    library.interests.find(
      (entry) =>
        entry.key === normalizedInterestKey,
    ) ?? null;

  if (!interest) {
    return {
      interest: null,
      discoveries: [],
    };
  }

  const discoveryIds = new Set(
    interest.discoveryIds,
  );

  const matchingDiscoveries =
    discoveries.filter(
      (discovery, index) => {
        const prepared = prepareDiscovery(
          discovery,
          index,
        );

        return discoveryIds.has(prepared.id);
      },
    );

  return {
    interest,
    discoveries:
      matchingDiscoveries.slice(0, limit),
  };
}