import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIRECTORY = path.resolve(__dirname, "../../data");
const DISCOVERIES_FILE = path.join(DATA_DIRECTORY, "discoveries.json");

async function ensureStorage() {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await fs.access(DISCOVERIES_FILE);
  } catch {
    await fs.writeFile(DISCOVERIES_FILE, "[]", "utf8");
  }
}

async function readDiscoveries() {
  await ensureStorage();

  try {
    const rawContent = await fs.readFile(DISCOVERIES_FILE, "utf8");
    const parsed = JSON.parse(rawContent);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Discoveries konnten nicht gelesen werden:", error);
    return [];
  }
}

async function writeDiscoveries(discoveries) {
  await ensureStorage();

  await fs.writeFile(
    DISCOVERIES_FILE,
    JSON.stringify(discoveries, null, 2),
    "utf8"
  );
}

export async function getAllDiscoveries() {
  return readDiscoveries();
}

export async function getDiscoveryById(id) {
  const discoveries = await readDiscoveries();
  return discoveries.find((discovery) => discovery.id === id) ?? null;
}

export async function createDiscovery(input) {
  const discoveries = await readDiscoveries();

  const now = new Date().toISOString();

  const discovery = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...input,
  };

  discoveries.unshift(discovery);
  await writeDiscoveries(discoveries);

  return discovery;
}

export async function updateDiscovery(id, updates) {
  const discoveries = await readDiscoveries();
  const index = discoveries.findIndex((discovery) => discovery.id === id);

  if (index === -1) {
    return null;
  }

  discoveries[index] = {
    ...discoveries[index],
    ...updates,
    id: discoveries[index].id,
    createdAt: discoveries[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  await writeDiscoveries(discoveries);

  return discoveries[index];
}

export async function deleteDiscovery(id) {
  const discoveries = await readDiscoveries();
  const filteredDiscoveries = discoveries.filter(
    (discovery) => discovery.id !== id
  );

  if (filteredDiscoveries.length === discoveries.length) {
    return false;
  }

  await writeDiscoveries(filteredDiscoveries);
  return true;
}