import AsyncStorage from "@react-native-async-storage/async-storage";

import { getDatabase } from "@/database/database";
import { sqliteDiscoveryRepository } from "@/repositories/sqlite-discovery-repository";
import { loadCachedDiscoveries } from "@/services/discovery-cache";

const MIGRATION_KEY =
  "async-storage-discoveries-migrated";

const LEGACY_CACHE_KEY =
  "@savewise/discovery-cache";

export async function migrateDiscoveryCacheToSQLite(): Promise<void> {
  const database =
    await getDatabase();

  const migrationRow =
    await database.getFirstAsync<{
      value: string;
    }>(
      `
        SELECT value
        FROM app_metadata
        WHERE key = ?
        LIMIT 1
      `,
      MIGRATION_KEY,
    );

  if (
    migrationRow?.value ===
    "true"
  ) {
    return;
  }

  const existingSQLiteCount =
    await sqliteDiscoveryRepository.count();

  if (existingSQLiteCount === 0) {
    const cachedDiscoveries =
      await loadCachedDiscoveries();

    if (
      cachedDiscoveries.length > 0
    ) {
      await sqliteDiscoveryRepository.saveAll(
        cachedDiscoveries,
      );
    }
  }

  await database.runAsync(
    `
      INSERT INTO app_metadata (
        key,
        value
      )
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value
    `,
    MIGRATION_KEY,
    "true",
  );

  try {
    await AsyncStorage.removeItem(
      LEGACY_CACHE_KEY,
    );
  } catch (error) {
    console.warn(
      "Legacy discovery cache could not be removed:",
      error,
    );
  }
}