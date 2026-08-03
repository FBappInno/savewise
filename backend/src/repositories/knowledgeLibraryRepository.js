import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIRECTORY = path.resolve(__dirname, "../../data");
const LIBRARY_FILE = path.join(DATA_DIRECTORY, "knowledge-library.json");

const EMPTY_LIBRARY = {
  generatedAt: null,
  statistics: {
    totalDiscoveries: 0,
    totalCategories: 0,
    totalTopics: 0,
    totalKeywords: 0,
    totalRelations: 0,
  },
  interests: [],
  categories: [],
  topics: [],
  keywordCloud: [],
  trends: [],
  relations: {},
};

async function ensureStorage() {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await fs.access(LIBRARY_FILE);
  } catch {
    await fs.writeFile(
      LIBRARY_FILE,
      JSON.stringify(EMPTY_LIBRARY, null, 2),
      "utf8"
    );
  }
}

export async function getKnowledgeLibrary() {
  await ensureStorage();

  try {
    const rawContent = await fs.readFile(LIBRARY_FILE, "utf8");
    return JSON.parse(rawContent);
  } catch (error) {
    console.error("Knowledge Library konnte nicht gelesen werden:", error);
    return EMPTY_LIBRARY;
  }
}

export async function saveKnowledgeLibrary(library) {
  await ensureStorage();

  await fs.writeFile(
    LIBRARY_FILE,
    JSON.stringify(library, null, 2),
    "utf8"
  );

  return library;
}