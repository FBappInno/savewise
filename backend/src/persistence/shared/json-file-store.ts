import { promises as fs } from "node:fs";
import path from "node:path";

const writeQueues =
  new Map<string, Promise<void>>();

export async function readJsonFile<T>(
  filePath: string,
  fallback: () => T,
  validator?: (
    value: unknown,
  ) => value is T,
): Promise<T> {
  try {
    const content =
      await fs.readFile(
        filePath,
        "utf8",
      );

    if (!content.trim()) {
      return fallback();
    }

    const parsedValue: unknown =
      JSON.parse(content);

    if (
      validator &&
      !validator(parsedValue)
    ) {
      return fallback();
    }

    return parsedValue as T;
  } catch (error) {
    if (
      isNodeError(error) &&
      error.code === "ENOENT"
    ) {
      return fallback();
    }

    throw error;
  }
}

export function writeJsonFile<T>(
  filePath: string,
  value: T,
  pretty = true,
): Promise<void> {
  const previousQueue =
    writeQueues.get(filePath) ??
    Promise.resolve();

  const operation =
    previousQueue.then(
      async () => {
        await fs.mkdir(
          path.dirname(filePath),
          {
            recursive: true,
          },
        );

        const temporaryFile =
          `${filePath}.tmp`;

        const serializedValue =
          pretty
            ? `${JSON.stringify(
                value,
                null,
                2,
              )}\n`
            : JSON.stringify(value);

        try {
          await fs.writeFile(
            temporaryFile,
            serializedValue,
            "utf8",
          );

          await fs.rename(
            temporaryFile,
            filePath,
          );
        } catch (error) {
          try {
            await fs.rm(
              temporaryFile,
              {
                force: true,
              },
            );
          } catch {
            // Der ursprüngliche Fehler bleibt erhalten.
          }

          throw error;
        }
      },
    );

  writeQueues.set(
    filePath,
    operation.catch(
      () => undefined,
    ),
  );

  return operation;
}

export async function deleteJsonFile(
  filePath: string,
): Promise<void> {
  await fs.rm(
    filePath,
    {
      force: true,
    },
  );
}

function isNodeError(
  error: unknown,
): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error
  );
}