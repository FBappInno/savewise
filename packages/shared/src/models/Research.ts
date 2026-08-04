export type ResearchSourceType =
  | "study"
  | "paper"
  | "video"
  | "podcast"
  | "news"
  | "github"
  | "startup"
  | "company"
  | "product"
  | "technology"
  | "whitepaper"
  | "documentation"
  | "article"
  | "other";

export type ResearchRelevance =
  | "relevant"
  | "partially-relevant"
  | "not-relevant";

export type ResearchInterestTrend =
  | "new"
  | "rising"
  | "stable"
  | "declining"
  | "long-term";

export type ResearchImpact =
  | "confirms"
  | "contradicts"
  | "extends"
  | "new-perspective";

export type ResearchCandidateStatus =
  | "suggested"
  | "saved"
  | "dismissed";

export interface ResearchInterest {
  id: string;
  title: string;
  description: string;
  nodeIds: string[];
  discoveryCount: number;
  strength: number;
  previousStrength: number | null;
  trend: ResearchInterestTrend;
  trendExplanation: string;
  firstDetectedAt: string;
  observedRuns: number;
  knowledgeGaps: string[];
}

export interface ResearchCandidateScores {
  relevance: number;
  quality: number;
  recency: number;
  trustworthiness: number;
  knowledgeValue: number;
  gapCoverage: number;
  overall: number;
}

export interface ResearchCandidate {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  sourceType: ResearchSourceType;
  publishedAt?: string;
  summary: string;
  interestId: string;
  scores: ResearchCandidateScores;
  relevance: ResearchRelevance;
  decisionReason: string;
  impact: ResearchImpact;
  impactExplanation: string;
  relatedDiscoveryIds: string[];
  status: ResearchCandidateStatus;
  foundAt: string;
}

export interface ResearchInsight {
  id: string;
  kind: "confirmation" | "contradiction" | "trend" | "knowledge-gap";
  title: string;
  description: string;
  candidateIds: string[];
  discoveryIds: string[];
  createdAt: string;
}

export interface ResearchBriefingCounts {
  totalFound: number;
  papers: number;
  videos: number;
  startups: number;
  studies: number;
  trends: number;
  knowledgeGaps: number;
  discarded: number;
}

export interface ResearchBriefing {
  id: string;
  date: string;
  title: string;
  summary: string;
  counts: ResearchBriefingCounts;
  candidateIds: string[];
  insightIds: string[];
  createdAt: string;
}

export interface ResearchState {
  lastRunAt: string | null;
  nextRecommendedRunAt: string | null;
  interests: ResearchInterest[];
  candidates: ResearchCandidate[];
  insights: ResearchInsight[];
  briefings: ResearchBriefing[];
}
