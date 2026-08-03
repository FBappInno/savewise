export type ResearchSourceType =
  | "study"
  | "paper"
  | "video"
  | "startup"
  | "company"
  | "technology"
  | "article"
  | "other";

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
  decisionReason: string;
  impact: ResearchImpact;
  impactExplanation: string;
  relatedDiscoveryIds: string[];
  status: ResearchCandidateStatus;
  foundAt: string;
}

export interface ResearchState {
  lastRunAt: string | null;
  nextRecommendedRunAt: string | null;
  interests: ResearchInterest[];
  candidates: ResearchCandidate[];
}
