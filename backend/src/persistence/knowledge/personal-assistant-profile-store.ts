import { promises as fs } from "node:fs";
import path from "node:path";

import type { PersonalKnowledgeProfile } from "@savewise/shared";

const PROFILE_FILE = path.resolve(
  process.cwd(),
  "data",
  "personal-assistant-profile.json",
);

export async function loadPersonalAssistantProfile(): Promise<PersonalKnowledgeProfile> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(PROFILE_FILE, "utf8"));
    return isProfile(parsed) ? parsed : emptyProfile();
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return emptyProfile();
    throw error;
  }
}

export async function savePersonalAssistantProfile(
  profile: PersonalKnowledgeProfile,
): Promise<void> {
  await fs.mkdir(path.dirname(PROFILE_FILE), { recursive: true });
  const temporaryFile = `${PROFILE_FILE}.tmp`;
  await fs.writeFile(temporaryFile, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  await fs.rename(temporaryFile, PROFILE_FILE);
}

export async function rememberKnowledgeQuestion(question: string): Promise<void> {
  const profile = await loadPersonalAssistantProfile();
  const normalized = question.trim();
  const questions = [
    normalized,
    ...profile.frequentQuestions.filter(
      (candidate) => candidate.toLocaleLowerCase() !== normalized.toLocaleLowerCase(),
    ),
  ].slice(0, 12);
  await savePersonalAssistantProfile({
    ...profile,
    frequentQuestions: questions,
    updatedAt: new Date().toISOString(),
  });
}

function emptyProfile(): PersonalKnowledgeProfile {
  return {
    interests: [],
    projects: [],
    learningGoals: [],
    frequentQuestions: [],
    developmentSummary: "",
    updatedAt: new Date(0).toISOString(),
  };
}

function isProfile(value: unknown): value is PersonalKnowledgeProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<PersonalKnowledgeProfile>;
  return Array.isArray(profile.interests) &&
    Array.isArray(profile.projects) &&
    Array.isArray(profile.learningGoals) &&
    Array.isArray(profile.frequentQuestions) &&
    typeof profile.developmentSummary === "string" &&
    typeof profile.updatedAt === "string";
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
