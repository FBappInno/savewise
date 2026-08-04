import { promises as fs } from "node:fs";
import path from "node:path";

import type { ResearchState } from "@savewise/shared";

const RESEARCH_FILE = path.resolve(
  process.cwd(),
  "data",
  "research-state.json",
);

const EMPTY_STATE: ResearchState = {
  lastRunAt: null,
  nextRecommendedRunAt: null,
  interests: [],
  candidates: [],
  insights: [],
  briefings: [],
};

export async function loadResearchState(): Promise<ResearchState> {
  try {
    const content = await fs.readFile(RESEARCH_FILE, "utf8");
    const parsed: unknown = JSON.parse(content);

    return isResearchState(parsed)
      ? {
          ...parsed,
          interests: parsed.interests.map((interest) => ({
            ...interest,
            previousStrength: interest.previousStrength ?? null,
            trend: interest.trend ?? "stable",
            trendExplanation: interest.trendExplanation ?? "",
            firstDetectedAt: interest.firstDetectedAt ?? parsed.lastRunAt ?? new Date(0).toISOString(),
            observedRuns: interest.observedRuns ?? 1,
          })),
          candidates: parsed.candidates.map((candidate) => ({
            ...candidate,
            relevance: candidate.relevance ?? (
              candidate.scores.overall >= 0.7
                ? "relevant"
                : "partially-relevant"
            ),
          })),
          insights: parsed.insights ?? [],
          briefings: parsed.briefings ?? [],
        }
      : { ...EMPTY_STATE };
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { ...EMPTY_STATE };
    }

    console.error("Failed to load research state:", error);
    return { ...EMPTY_STATE };
  }
}

export async function saveResearchState(
  state: ResearchState,
): Promise<void> {
  await fs.mkdir(path.dirname(RESEARCH_FILE), { recursive: true });
  const temporaryFile = `${RESEARCH_FILE}.tmp`;

  await fs.writeFile(
    temporaryFile,
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8",
  );
  await fs.rename(temporaryFile, RESEARCH_FILE);
}

function isResearchState(value: unknown): value is ResearchState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<ResearchState>;

  return Array.isArray(state.interests) && Array.isArray(state.candidates);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
