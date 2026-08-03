import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Discovery } from "@/types/discovery";

const DISCOVERIES_STORAGE_KEY = "@savewise/discoveries";

function migrateDiscovery(
  discovery: Partial<Discovery>,
): Discovery | null {
  if (
    typeof discovery.id !== "string" ||
    typeof discovery.title !== "string" ||
    typeof discovery.source !== "string"
  ) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: discovery.id,
    title: discovery.title,
    source: discovery.source as Discovery["source"],
    url: discovery.url,

    description: discovery.description,
    summary: discovery.summary,

    thumbnailUrl: discovery.thumbnailUrl,
    author: discovery.author,
    publishedAt: discovery.publishedAt,

    classification: discovery.classification,

    keywords: Array.isArray(discovery.keywords)
      ? discovery.keywords
      : [],

    language: discovery.language,

    confidence:
      typeof discovery.confidence === "number"
        ? discovery.confidence
        : undefined,

    topics: Array.isArray(discovery.topics)
      ? discovery.topics
      : ["New"],

    createdAt:
      typeof discovery.createdAt === "string"
        ? discovery.createdAt
        : now,

    updatedAt:
      typeof discovery.updatedAt === "string"
        ? discovery.updatedAt
        : typeof discovery.createdAt === "string"
          ? discovery.createdAt
          : now,

    savedAtLabel:
      typeof discovery.savedAtLabel === "string"
        ? discovery.savedAtLabel
        : "Saved",
  };
}

export async function loadDiscoveries(): Promise<Discovery[]> {
  try {
    const storedValue = await AsyncStorage.getItem(
      DISCOVERIES_STORAGE_KEY,
    );

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    const migratedDiscoveries = parsedValue
      .map((item) =>
        migrateDiscovery(
          item as Partial<Discovery>,
        ),
      )
      .filter(
        (item): item is Discovery =>
          item !== null,
      );

    /*
     * Bereits vorhandene Einträge werden nach der Migration
     * direkt wieder im neuen Format gespeichert.
     */
    if (
      migratedDiscoveries.length !== parsedValue.length ||
      migratedDiscoveries.some(
        (discovery, index) =>
          JSON.stringify(discovery) !==
          JSON.stringify(parsedValue[index]),
      )
    ) {
      await AsyncStorage.setItem(
        DISCOVERIES_STORAGE_KEY,
        JSON.stringify(migratedDiscoveries),
      );
    }

    return migratedDiscoveries;
  } catch (error) {
    console.error("Failed to load discoveries:", error);
    return [];
  }
}

export async function saveDiscoveries(
  discoveries: Discovery[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      DISCOVERIES_STORAGE_KEY,
      JSON.stringify(discoveries),
    );
  } catch (error) {
    console.error("Failed to save discoveries:", error);
    throw error;
  }
}