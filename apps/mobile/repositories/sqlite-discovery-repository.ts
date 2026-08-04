import { getDatabase } from "@/database/database";
import type { Discovery } from "@/types/discovery";

export type DiscoverySyncStatus =
  | "synced"
  | "pending-import"
  | "pending-update"
  | "pending-delete"
  | "failed";

type DiscoveryRow = {
  id: string;
  payload: string;
  created_at: string;
  updated_at: string;
  sync_status: DiscoverySyncStatus;
  last_sync_error: string | null;
};

export class SQLiteDiscoveryRepository {
  async getAll(): Promise<Discovery[]> {
    const database =
      await getDatabase();

    const rows =
      await database.getAllAsync<DiscoveryRow>(
        `
          SELECT
            id,
            payload,
            created_at,
            updated_at,
            sync_status,
            last_sync_error
          FROM discoveries
          WHERE sync_status != 'pending-delete'
          ORDER BY created_at DESC
        `,
      );

    return rows
      .map(parseDiscoveryRow)
      .filter(
        (
          discovery,
        ): discovery is Discovery =>
          discovery !== null,
      );
  }

  async getById(
    discoveryId: string,
  ): Promise<Discovery | null> {
    const database =
      await getDatabase();

    const row =
      await database.getFirstAsync<DiscoveryRow>(
        `
          SELECT
            id,
            payload,
            created_at,
            updated_at,
            sync_status,
            last_sync_error
          FROM discoveries
          WHERE id = ?
            AND sync_status != 'pending-delete'
          LIMIT 1
        `,
        discoveryId,
      );

    return row
      ? parseDiscoveryRow(row)
      : null;
  }

  async save(
    discovery: Discovery,
    syncStatus:
      DiscoverySyncStatus = "synced",
  ): Promise<void> {
    const database =
      await getDatabase();

    await database.runAsync(
      `
        INSERT INTO discoveries (
          id,
          payload,
          created_at,
          updated_at,
          sync_status,
          last_sync_error
        )
        VALUES (?, ?, ?, ?, ?, NULL)
        ON CONFLICT(id) DO UPDATE SET
          payload = excluded.payload,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          sync_status = excluded.sync_status,
          last_sync_error = NULL
      `,
      discovery.id,
      JSON.stringify(discovery),
      discovery.createdAt,
      discovery.updatedAt,
      syncStatus,
    );
  }

  async saveAll(
    discoveries: Discovery[],
    syncStatus:
      DiscoverySyncStatus = "synced",
  ): Promise<void> {
    const database =
      await getDatabase();

    await database.withTransactionAsync(
      async () => {
        for (const discovery of discoveries) {
          await database.runAsync(
            `
              INSERT INTO discoveries (
                id,
                payload,
                created_at,
                updated_at,
                sync_status,
                last_sync_error
              )
              VALUES (?, ?, ?, ?, ?, NULL)
              ON CONFLICT(id) DO UPDATE SET
                payload = excluded.payload,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at,
                sync_status = excluded.sync_status,
                last_sync_error = NULL
            `,
            discovery.id,
            JSON.stringify(discovery),
            discovery.createdAt,
            discovery.updatedAt,
            syncStatus,
          );
        }
      },
    );
  }

  async replaceAll(
    discoveries: Discovery[],
  ): Promise<void> {
    const database =
      await getDatabase();

    await database.withTransactionAsync(
      async () => {
        const pendingRows =
          await database.getAllAsync<DiscoveryRow>(
            `
              SELECT
                id,
                payload,
                created_at,
                updated_at,
                sync_status,
                last_sync_error
              FROM discoveries
              WHERE sync_status != 'synced'
            `,
          );

        await database.runAsync(
          `
            DELETE FROM discoveries
            WHERE sync_status = 'synced'
          `,
        );

        for (const discovery of discoveries) {
          await database.runAsync(
            `
              INSERT INTO discoveries (
                id,
                payload,
                created_at,
                updated_at,
                sync_status,
                last_sync_error
              )
              VALUES (?, ?, ?, ?, 'synced', NULL)
              ON CONFLICT(id) DO UPDATE SET
                payload = excluded.payload,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at,
                sync_status = 'synced',
                last_sync_error = NULL
            `,
            discovery.id,
            JSON.stringify(discovery),
            discovery.createdAt,
            discovery.updatedAt,
          );
        }

        for (const row of pendingRows) {
          const alreadyExists =
            discoveries.some(
              (discovery) =>
                discovery.id === row.id,
            );

          if (alreadyExists) {
            continue;
          }

          await database.runAsync(
            `
              INSERT OR REPLACE INTO discoveries (
                id,
                payload,
                created_at,
                updated_at,
                sync_status,
                last_sync_error
              )
              VALUES (?, ?, ?, ?, ?, ?)
            `,
            row.id,
            row.payload,
            row.created_at,
            row.updated_at,
            row.sync_status,
            row.last_sync_error,
          );
        }
      },
    );
  }

  async delete(
    discoveryId: string,
  ): Promise<void> {
    const database =
      await getDatabase();

    await database.runAsync(
      `
        DELETE FROM discoveries
        WHERE id = ?
      `,
      discoveryId,
    );
  }

  async markPendingDelete(
    discoveryId: string,
  ): Promise<void> {
    const database =
      await getDatabase();

    await database.runAsync(
      `
        UPDATE discoveries
        SET
          sync_status = 'pending-delete',
          updated_at = ?,
          last_sync_error = NULL
        WHERE id = ?
      `,
      new Date().toISOString(),
      discoveryId,
    );
  }

  async markFailed(
    discoveryId: string,
    errorMessage: string,
  ): Promise<void> {
    const database =
      await getDatabase();

    await database.runAsync(
      `
        UPDATE discoveries
        SET
          sync_status = 'failed',
          last_sync_error = ?,
          updated_at = ?
        WHERE id = ?
      `,
      errorMessage,
      new Date().toISOString(),
      discoveryId,
    );
  }

  async count(): Promise<number> {
    const database =
      await getDatabase();

    const row =
      await database.getFirstAsync<{
        count: number;
      }>(
        `
          SELECT COUNT(*) AS count
          FROM discoveries
          WHERE sync_status != 'pending-delete'
        `,
      );

    return row?.count ?? 0;
  }
}

function parseDiscoveryRow(
  row: DiscoveryRow,
): Discovery | null {
  try {
    const parsedValue: unknown =
      JSON.parse(row.payload);

    if (!isDiscovery(parsedValue)) {
      console.warn(
        "Invalid discovery stored in SQLite:",
        row.id,
      );

      return null;
    }

    return parsedValue;
  } catch (error) {
    console.error(
      "Failed to parse discovery from SQLite:",
      row.id,
      error,
    );

    return null;
  }
}

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
    typeof discovery.createdAt === "string" &&
    typeof discovery.updatedAt === "string" &&
    Array.isArray(discovery.topics) &&
    Array.isArray(discovery.keywords)
  );
}

export const sqliteDiscoveryRepository =
  new SQLiteDiscoveryRepository();