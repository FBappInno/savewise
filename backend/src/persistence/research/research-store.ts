import type {
  ResearchState,
} from "@savewise/shared";

import { storagePaths } from "../../config/storage-paths";
import {
  readJsonFile,
  writeJsonFile,
} from "../shared/json-file-store";

const EMPTY_STATE: ResearchState = {
  lastRunAt: null,

  nextRecommendedRunAt: null,

  interests: [],

  candidates: [],

  insights: [],

  briefings: [],
};

export async function loadResearchState(): Promise<ResearchState> {
  const state =
    await readJsonFile(
      storagePaths.researchState,
      createEmptyState,
      isResearchState,
    );

  return normalizeResearchState(
    state,
  );
}

export async function saveResearchState(
  state: ResearchState,
): Promise<void> {
  await writeJsonFile(
    storagePaths.researchState,
    state,
  );
}

function createEmptyState(): ResearchState {
  return structuredClone(
    EMPTY_STATE,
  );
}

function normalizeResearchState(
  state: ResearchState,
): ResearchState {
  return {
    ...state,

    interests:
      state.interests.map(
        (interest) => ({
          ...interest,

          previousStrength:
            interest.previousStrength ??
            null,

          trend:
            interest.trend ??
            "stable",

          trendExplanation:
            interest.trendExplanation ??
            "",

          firstDetectedAt:
            interest.firstDetectedAt ??
            state.lastRunAt ??
            new Date(
              0,
            ).toISOString(),

          observedRuns:
            interest.observedRuns ??
            1,

          knowledgeGaps:
            Array.isArray(
              interest.knowledgeGaps,
            )
              ? interest.knowledgeGaps
              : [],
        }),
      ),

    candidates:
      state.candidates.map(
        (candidate) => ({
          ...candidate,

          relevance:
            candidate.relevance ??
            (
              candidate.scores
                .overall >= 0.7
                ? "relevant"
                : "partially-relevant"
            ),
        }),
      ),

    insights:
      state.insights ?? [],

    briefings:
      state.briefings ?? [],
  };
}

function isResearchState(
  value: unknown,
): value is ResearchState {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const state =
    value as Partial<ResearchState>;

  return (
    Array.isArray(
      state.interests,
    ) &&
    Array.isArray(
      state.candidates,
    ) &&
    (
      state.insights === undefined ||
      Array.isArray(
        state.insights,
      )
    ) &&
    (
      state.briefings === undefined ||
      Array.isArray(
        state.briefings,
      )
    )
  );
}