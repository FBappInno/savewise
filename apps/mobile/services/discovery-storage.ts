import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Discovery } from "@/types/discovery";

const DISCOVERIES_STORAGE_KEY = "@savewise/discoveries";

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

    return parsedValue as Discovery[];
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
  }
}