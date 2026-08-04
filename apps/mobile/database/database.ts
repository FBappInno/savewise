import * as SQLite from "expo-sqlite";

import { migrateDatabase } from "@/database/migrations";

const DATABASE_NAME =
  "savewise.db";

let databasePromise:
  | Promise<SQLite.SQLiteDatabase>
  | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise =
      openAndPrepareDatabase();
  }

  return databasePromise;
}

async function openAndPrepareDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database =
    await SQLite.openDatabaseAsync(
      DATABASE_NAME,
    );

  await migrateDatabase(
    database,
  );

  return database;
}

export async function resetDatabase(): Promise<void> {
  if (databasePromise) {
    const database =
      await databasePromise;

    await database.closeAsync();

    databasePromise = null;
  }

  await SQLite.deleteDatabaseAsync(
    DATABASE_NAME,
  );
}