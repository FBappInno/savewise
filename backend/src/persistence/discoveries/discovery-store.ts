import { promises as fs } from "node:fs";
import path from "node:path";

import type { Discovery } from "@savewise/shared";

const BACKEND_DIRECTORY = path.resolve(
  process.cwd(),
);

const DATA_DIRECTORY = path.join(
  BACKEND_DIRECTORY,
  "data",
);

const DISCOVERIES_FILE = path.join(
  DATA_DIRECTORY,
  "discoveries.json",
);

function isStringArray(
  value: unknown,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "string",
    )
  );
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
    typeof discovery.source === "string" &&
    typeof discovery.title === "string" &&
    isStringArray(discovery.keywords) &&
    isStringArray(discovery.topics) &&
    typeof discovery.createdAt === "string" &&
    typeof discovery.updatedAt === "string" &&
    typeof discovery.savedAtLabel === "string"
  );
}

async function ensureDiscoveriesFile(): Promise<void> {
  await fs.mkdir(DATA_DIRECTORY, {
    recursive: true,
  });

  try {
    await fs.access(
      DISCOVERIES_FILE,
    );
  } catch {
    await fs.writeFile(
      DISCOVERIES_FILE,
      "[]\n",
      "utf8",
    );
  }
}

export async function loadDiscoveries(): Promise<
  Discovery[]
> {
  await ensureDiscoveriesFile();

  try {
    const fileContent =
      await fs.readFile(
        DISCOVERIES_FILE,
        "utf8",
      );

    if (!fileContent.trim()) {
      return [];
    }

    const parsedValue: unknown =
      JSON.parse(fileContent);

    if (!Array.isArray(parsedValue)) {
      console.error(
        "The discoveries file does not contain an array.",
      );

      return [];
    }

    return parsedValue.filter(isDiscovery);
  } catch (error) {
    console.error(
      "Failed to load discoveries:",
      error,
    );

    return [];
  }
}

export async function saveDiscoveries(
  discoveries: Discovery[],
): Promise<void> {
  await ensureDiscoveriesFile();

  const temporaryFile =
    `${DISCOVERIES_FILE}.tmp`;

  try {
    await fs.writeFile(
      temporaryFile,
      JSON.stringify(
        discoveries,
        null,
        2,
      ),
      "utf8",
    );

    await fs.rename(
      temporaryFile,
      DISCOVERIES_FILE,
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
      // Ignorieren.
    }

    throw error;
  }
}