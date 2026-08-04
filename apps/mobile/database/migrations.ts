import type {
  SQLiteDatabase,
} from "expo-sqlite";

const DATABASE_VERSION = 1;

export async function migrateDatabase(
  database: SQLiteDatabase,
): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const versionRow =
    await database.getFirstAsync<{
      user_version: number;
    }>(
      "PRAGMA user_version",
    );

  const currentVersion =
    versionRow?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion < 1) {
    await migrateToVersionOne(
      database,
    );
  }

  await database.execAsync(
    `PRAGMA user_version = ${DATABASE_VERSION};`,
  );
}

async function migrateToVersionOne(
  database: SQLiteDatabase,
): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS discoveries (
      id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      last_sync_error TEXT
    );

    CREATE INDEX IF NOT EXISTS discoveries_created_at_index
    ON discoveries(created_at DESC);

    CREATE INDEX IF NOT EXISTS discoveries_updated_at_index
    ON discoveries(updated_at DESC);

    CREATE INDEX IF NOT EXISTS discoveries_sync_status_index
    ON discoveries(sync_status);

    CREATE TABLE IF NOT EXISTS pending_operations (
      id TEXT PRIMARY KEY NOT NULL,
      operation_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );

    CREATE INDEX IF NOT EXISTS pending_operations_created_at_index
    ON pending_operations(created_at ASC);

    CREATE TABLE IF NOT EXISTS local_documents (
      key TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}