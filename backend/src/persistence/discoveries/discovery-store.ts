import type {
  Discovery,
} from "@savewise/shared";

import { storagePaths } from "../../config/storage-paths";
import {
  readJsonFile,
  writeJsonFile,
} from "../shared/json-file-store";

export async function loadDiscoveries(): Promise<
  Discovery[]
> {
  try {
    return await readJsonFile(
      storagePaths.discoveries,
      () => [],
      isDiscoveryArray,
    );
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
  await writeJsonFile(
    storagePaths.discoveries,
    discoveries,
  );
}

function isDiscoveryArray(
  value: unknown,
): value is Discovery[] {
  return (
    Array.isArray(value) &&
    value.every(isDiscovery)
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
    typeof discovery.id ===
      "string" &&
    typeof discovery.source ===
      "string" &&
    typeof discovery.title ===
      "string" &&
    isStringArray(
      discovery.keywords,
    ) &&
    isStringArray(
      discovery.topics,
    ) &&
    typeof discovery.createdAt ===
      "string" &&
    typeof discovery.updatedAt ===
      "string" &&
    typeof discovery.savedAtLabel ===
      "string"
  );
}

function isStringArray(
  value: unknown,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "string",
    )
  );
}