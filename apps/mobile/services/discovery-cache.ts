import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Discovery } from "@/types/discovery";

const DISCOVERY_CACHE_KEY =
  "@savewise/discovery-cache";

function isDiscovery(
  value: unknown,
): value is Discovery {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return false;
  }

  const discovery =
    value as Partial<Discovery>;

  return (
    typeof discovery.id === "string" &&
    typeof discovery.title === "string" &&
    typeof discovery.source === "string" &&
    Array.isArray(discovery.keywords) &&
    Array.isArray(discovery.topics) &&
    typeof discovery.createdAt === "string" &&
    typeof discovery.updatedAt === "string"
  );
}

export async function loadCachedDiscoveries(): Promise<
  Discovery[]
> {
  try {
    const storedValue =
      await AsyncStorage.getItem(
        DISCOVERY_CACHE_KEY,
      );

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown =
      JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isDiscovery);
  } catch (error) {
    console.error(
      "Failed to load discovery cache:",
      error,
    );

    return [];
  }
}

export async function saveCachedDiscoveries(
  discoveries: Discovery[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      DISCOVERY_CACHE_KEY,
      JSON.stringify(discoveries),
    );
  } catch (error) {
    console.error(
      "Failed to save discovery cache:",
      error,
    );
  }
}

export async function clearDiscoveryCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(
      DISCOVERY_CACHE_KEY,
    );
  } catch (error) {
    console.error(
      "Failed to clear discovery cache:",
      error,
    );
  }
}