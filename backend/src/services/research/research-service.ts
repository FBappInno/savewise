import type {
  Discovery,
  KnowledgeGraph,
  ResearchCandidateStatus,
  ResearchState,
} from "@savewise/shared";

import {
  loadResearchState,
  saveResearchState,
} from "../../persistence/research/research-store";
import { researchNewKnowledge } from "../ai/openai-research-agent";

const RESEARCH_INTERVAL_HOURS = 24;

export async function getResearchState(): Promise<ResearchState> {
  return loadResearchState();
}

export async function runPersonalResearch(
  discoveries: Discovery[],
  graph: KnowledgeGraph,
): Promise<ResearchState> {
  const previousState = await loadResearchState();
  const research = await researchNewKnowledge(discoveries, graph);
  const previousCandidates = new Map(
    previousState.candidates.map((candidate) => [candidate.id, candidate]),
  );
  const now = new Date();
  const candidates = research.candidates.map((candidate) => {
    const previousCandidate = previousCandidates.get(candidate.id);

    return previousCandidate
      ? {
          ...candidate,
          status: previousCandidate.status,
          foundAt: previousCandidate.foundAt,
        }
      : candidate;
  });
  const retainedCandidates = previousState.candidates.filter(
    (candidate) =>
      candidate.status !== "suggested" &&
      !candidates.some((current) => current.id === candidate.id),
  );
  const state: ResearchState = {
    lastRunAt: now.toISOString(),
    nextRecommendedRunAt: new Date(
      now.getTime() + RESEARCH_INTERVAL_HOURS * 60 * 60 * 1000,
    ).toISOString(),
    interests: research.interests,
    candidates: [...candidates, ...retainedCandidates],
  };

  await saveResearchState(state);
  return state;
}

export async function updateResearchCandidateStatus(
  candidateId: string,
  status: ResearchCandidateStatus,
): Promise<ResearchState | null> {
  const state = await loadResearchState();
  const candidate = state.candidates.find((item) => item.id === candidateId);

  if (!candidate) {
    return null;
  }

  candidate.status = status;
  await saveResearchState(state);
  return state;
}

export function startResearchScheduler(
  run: () => Promise<void>,
): NodeJS.Timeout | null {
  if (process.env.RESEARCH_AUTOMATION_ENABLED !== "true") {
    return null;
  }

  const hours = normalizeIntervalHours(
    process.env.RESEARCH_INTERVAL_HOURS,
  );
  const interval = setInterval(() => {
    void run().catch((error: unknown) => {
      console.error("Scheduled personal research failed:", error);
    });
  }, hours * 60 * 60 * 1000);

  interval.unref();
  return interval;
}

function normalizeIntervalHours(value: string | undefined): number {
  const hours = Number(value ?? RESEARCH_INTERVAL_HOURS);

  return Number.isFinite(hours) && hours >= 1
    ? Math.min(hours, 24 * 30)
    : RESEARCH_INTERVAL_HOURS;
}
