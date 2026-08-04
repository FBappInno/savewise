import { getDatabase } from "@/database/database";

type LocalDocumentRow = {
  key: string;
  payload: string;
  updated_at: string;
};

export type StoredDocument<T> = {
  value: T;
  updatedAt: string;
};

export class LocalDocumentRepository {
  async get<T>(
    key: string,
  ): Promise<StoredDocument<T> | null> {
    const database =
      await getDatabase();

    const row =
      await database.getFirstAsync<LocalDocumentRow>(
        `
          SELECT
            key,
            payload,
            updated_at
          FROM local_documents
          WHERE key = ?
          LIMIT 1
        `,
        key,
      );

    if (!row) {
      return null;
    }

    try {
      return {
        value: JSON.parse(
          row.payload,
        ) as T,

        updatedAt:
          row.updated_at,
      };
    } catch (error) {
      console.error(
        `Failed to parse local document "${key}":`,
        error,
      );

      return null;
    }
  }

  async save<T>(
    key: string,
    value: T,
  ): Promise<void> {
    const database =
      await getDatabase();

    const updatedAt =
      new Date().toISOString();

    await database.runAsync(
      `
        INSERT INTO local_documents (
          key,
          payload,
          updated_at
        )
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          payload = excluded.payload,
          updated_at = excluded.updated_at
      `,
      key,
      JSON.stringify(value),
      updatedAt,
    );
  }

  async delete(
    key: string,
  ): Promise<void> {
    const database =
      await getDatabase();

    await database.runAsync(
      `
        DELETE FROM local_documents
        WHERE key = ?
      `,
      key,
    );
  }

  async has(
    key: string,
  ): Promise<boolean> {
    const database =
      await getDatabase();

    const row =
      await database.getFirstAsync<{
        count: number;
      }>(
        `
          SELECT COUNT(*) AS count
          FROM local_documents
          WHERE key = ?
        `,
        key,
      );

    return (
      (row?.count ?? 0) > 0
    );
  }

  async clear(): Promise<void> {
    const database =
      await getDatabase();

    await database.runAsync(
      "DELETE FROM local_documents",
    );
  }
}

export const localDocumentRepository =
  new LocalDocumentRepository();