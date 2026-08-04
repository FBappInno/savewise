import type {
  PersonalKnowledgeProfile,
} from "@savewise/shared";

import { storagePaths } from "../../config/storage-paths";
import {
  readJsonFile,
  writeJsonFile,
} from "../shared/json-file-store";

export async function loadPersonalAssistantProfile(): Promise<PersonalKnowledgeProfile> {
  return readJsonFile(
    storagePaths
      .personalAssistantProfile,
    emptyProfile,
    isProfile,
  );
}

export async function savePersonalAssistantProfile(
  profile: PersonalKnowledgeProfile,
): Promise<void> {
  await writeJsonFile(
    storagePaths
      .personalAssistantProfile,
    profile,
  );
}

export async function rememberKnowledgeQuestion(
  question: string,
): Promise<void> {
  const normalizedQuestion =
    question.trim();

  if (!normalizedQuestion) {
    return;
  }

  const profile =
    await loadPersonalAssistantProfile();

  const questions = [
    normalizedQuestion,

    ...profile.frequentQuestions.filter(
      (candidate) =>
        candidate
          .toLocaleLowerCase() !==
        normalizedQuestion
          .toLocaleLowerCase(),
    ),
  ].slice(0, 12);

  await savePersonalAssistantProfile({
    ...profile,

    frequentQuestions:
      questions,

    updatedAt:
      new Date().toISOString(),
  });
}

function emptyProfile(): PersonalKnowledgeProfile {
  return {
    interests: [],

    projects: [],

    learningGoals: [],

    frequentQuestions: [],

    developmentSummary: "",

    updatedAt:
      new Date(0).toISOString(),
  };
}

function isProfile(
  value: unknown,
): value is PersonalKnowledgeProfile {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const profile =
    value as Partial<PersonalKnowledgeProfile>;

  return (
    Array.isArray(
      profile.interests,
    ) &&
    Array.isArray(
      profile.projects,
    ) &&
    Array.isArray(
      profile.learningGoals,
    ) &&
    Array.isArray(
      profile.frequentQuestions,
    ) &&
    typeof profile.developmentSummary ===
      "string" &&
    typeof profile.updatedAt ===
      "string"
  );
}