import type {
  Discovery,
  KnowledgeGraph,
  ResearchBriefing,
  ResearchCandidateStatus,
  ResearchInsight,
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
  const research = await researchNewKnowledge(
    discoveries,
    graph,
    previousState.interests,
  );
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
  const artifacts = createResearchRunArtifacts(
    research.interests,
    candidates,
    research.discardedCount,
    graph.language,
    now,
  );
  const previousBriefings = previousState.briefings ?? [];
  const previousInsights = previousState.insights ?? [];
  const intervalHours = normalizeIntervalHours(process.env.RESEARCH_INTERVAL_HOURS);
  const state: ResearchState = {
    lastRunAt: now.toISOString(),
    nextRecommendedRunAt: new Date(
      now.getTime() + intervalHours * 60 * 60 * 1000,
    ).toISOString(),
    interests: research.interests,
    candidates: [...candidates, ...retainedCandidates],
    insights: uniqueById([
      ...artifacts.insights,
      ...previousInsights,
    ]).slice(0, 100),
    briefings: [
      artifacts.briefing,
      ...previousBriefings.filter(
        (briefing) => briefing.date !== artifacts.briefing.date,
      ),
    ].slice(0, 30),
  };

  await saveResearchState(state);
  return state;
}

export function createResearchRunArtifacts(
  interests: ResearchState["interests"],
  candidates: ResearchState["candidates"],
  discardedCount: number,
  language: string,
  now = new Date(),
): { insights: ResearchInsight[]; briefing: ResearchBriefing } {
  const createdAt = now.toISOString();
  const date = createdAt.slice(0, 10);
  const meaningfulCandidates = candidates.filter(
    (candidate) => candidate.relevance !== "not-relevant",
  );
  const comparisonInsights: ResearchInsight[] = meaningfulCandidates
    .filter((candidate) =>
      candidate.impact === "confirms" || candidate.impact === "contradicts",
    )
    .map((candidate) => ({
      id: `insight-${candidate.impact}-${candidate.id}`,
      kind: candidate.impact === "confirms" ? "confirmation" : "contradiction",
      title: candidate.impact === "confirms"
        ? localize(language, "Bestehendes Wissen bestätigt", "Existing knowledge confirmed")
        : localize(language, "Möglicher Widerspruch erkannt", "Possible contradiction detected"),
      description: candidate.impactExplanation,
      candidateIds: [candidate.id],
      discoveryIds: candidate.relatedDiscoveryIds,
      createdAt,
    }));
  const trendInterests = interests.filter(
    (interest) => interest.trend === "new" || interest.trend === "rising" || interest.trend === "declining",
  );
  const trendInsight: ResearchInsight[] = trendInterests.length === 0 ? [] : [{
    id: `insight-trends-${date}`,
    kind: "trend",
    title: localize(language, "Interessen verändern sich", "Interests are changing"),
    description: trendInterests
      .map((interest) => `${interest.title}: ${interest.trendExplanation}`)
      .join(" "),
    candidateIds: [],
    discoveryIds: [],
    createdAt,
  }];
  const gaps = interests.flatMap((interest) => interest.knowledgeGaps);
  const gapInsight: ResearchInsight[] = gaps.length === 0 ? [] : [{
    id: `insight-gaps-${date}`,
    kind: "knowledge-gap",
    title: localize(language, "Gezielte Wissenslücken", "Targeted knowledge gaps"),
    description: gaps.slice(0, 5).join(" · "),
    candidateIds: meaningfulCandidates
      .filter((candidate) => candidate.scores.gapCoverage >= 0.65)
      .map((candidate) => candidate.id),
    discoveryIds: [],
    createdAt,
  }];
  const insights = [...comparisonInsights, ...trendInsight, ...gapInsight];
  const counts = {
    totalFound: meaningfulCandidates.length,
    papers: meaningfulCandidates.filter((item) => item.sourceType === "paper").length,
    videos: meaningfulCandidates.filter((item) => item.sourceType === "video").length,
    startups: meaningfulCandidates.filter((item) => item.sourceType === "startup").length,
    studies: meaningfulCandidates.filter((item) => item.sourceType === "study").length,
    trends: trendInterests.length,
    knowledgeGaps: gaps.length,
    discarded: discardedCount,
  };
  const briefing: ResearchBriefing = {
    id: `briefing-${date}`,
    date,
    title: localize(language, "Dein tägliches Research-Briefing", "Your daily research briefing"),
    summary: localize(
      language,
      `${counts.totalFound} relevante Quellen gefunden, ${counts.discarded} ungeeignete Treffer verworfen und ${counts.knowledgeGaps} Wissenslücken berücksichtigt.`,
      `${counts.totalFound} relevant sources found, ${counts.discarded} unsuitable results discarded, and ${counts.knowledgeGaps} knowledge gaps considered.`,
    ),
    counts,
    candidateIds: meaningfulCandidates.map((candidate) => candidate.id),
    insightIds: insights.map((insight) => insight.id),
    createdAt,
  };
  return { insights, briefing };
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
  if (
    process.env.RESEARCH_AUTOMATION_ENABLED === "false" ||
    !process.env.OPENAI_API_KEY
  ) {
    return null;
  }

  const hours = normalizeIntervalHours(
    process.env.RESEARCH_INTERVAL_HOURS,
  );
  let running = false;
  const execute = async () => {
    if (running) return;
    running = true;
    try {
      await run();
    } catch (error: unknown) {
      console.error("Scheduled personal research failed:", error);
    } finally {
      running = false;
    }
  };
  const pollInterval = Math.min(hours * 60 * 60 * 1000, 15 * 60 * 1000);
  const interval = setInterval(() => {
    void execute();
  }, pollInterval);

  interval.unref();
  if (process.env.RESEARCH_RUN_ON_STARTUP !== "false") {
    void execute();
  }
  return interval;
}

export function isResearchDue(
  state: Pick<ResearchState, "nextRecommendedRunAt">,
  now = new Date(),
): boolean {
  if (!state.nextRecommendedRunAt) return true;
  const nextRun = Date.parse(state.nextRecommendedRunAt);
  return !Number.isFinite(nextRun) || nextRun <= now.getTime();
}

function uniqueById<T extends { id: string }>(values: T[]): T[] {
  return [...new Map(values.map((value) => [value.id, value])).values()];
}

function localize(language: string, german: string, fallback: string): string {
  return language.toLowerCase().startsWith("de") ? german : fallback;
}

function normalizeIntervalHours(value: string | undefined): number {
  const hours = Number(value ?? RESEARCH_INTERVAL_HOURS);

  return Number.isFinite(hours) && hours >= 1
    ? Math.min(hours, 24 * 30)
    : RESEARCH_INTERVAL_HOURS;
}
