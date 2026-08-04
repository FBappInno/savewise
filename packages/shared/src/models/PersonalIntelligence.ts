import type { KnowledgeCitation, KnowledgeDocumentSection } from "./SecondBrain";

export type IntelligenceLearningTrigger =
  | "discovery-added"
  | "discovery-updated"
  | "discovery-deleted"
  | "graph-refined"
  | "research-completed";

export interface KnowledgeModelDelta {
  addedNodeIds: string[];
  removedNodeIds: string[];
  movedNodeIds: string[];
  addedRelationIds: string[];
  removedRelationIds: string[];
  summaryChanged: boolean;
}

export interface IntelligenceLearningEvent {
  id: string;
  version: number;
  trigger: IntelligenceLearningTrigger;
  discoveryId?: string;
  graphFingerprint: string;
  delta: KnowledgeModelDelta;
  explanation: string;
  createdAt: string;
}

export type IntelligencePredictionKind =
  | "next-interest"
  | "project-gap"
  | "emerging-focus";

export interface IntelligencePrediction {
  id: string;
  kind: IntelligencePredictionKind;
  title: string;
  explanation: string;
  confidence: number;
  nodeIds: string[];
  discoveryIds: string[];
  suggestedTopics: string[];
}

export type IntelligenceRecommendationKind =
  | "new-source"
  | "similar-discovery"
  | "literature"
  | "expert"
  | "company"
  | "product"
  | "study"
  | "video";

export interface IntelligenceRecommendation {
  id: string;
  kind: IntelligenceRecommendationKind;
  title: string;
  description: string;
  confidence: number;
  nodeIds: string[];
  discoveryIds: string[];
  researchCandidateId?: string;
  url?: string;
}

export interface PersonalIntelligenceOverview {
  generatedAt: string;
  modelVersion: number;
  graphFingerprint: string;
  latestLearningEvent: IntelligenceLearningEvent | null;
  learningHistory: IntelligenceLearningEvent[];
  predictions: IntelligencePrediction[];
  recommendations: IntelligenceRecommendation[];
}

export type WorkAssistantTaskType =
  | "meeting-brief"
  | "presentation"
  | "project-summary"
  | "learning-plan"
  | "talk-outline"
  | "business-case";

export interface WorkAssistantRequest {
  type: WorkAssistantTaskType;
  instruction: string;
  includeVerifiedResearch: boolean;
}

export interface VerifiedResearchCitation {
  candidateId: string;
  title: string;
  url: string;
  sourceName: string;
  contribution: string;
}

export interface WorkAssistantResult {
  id: string;
  type: WorkAssistantTaskType;
  title: string;
  introduction: string;
  sections: KnowledgeDocumentSection[];
  libraryCitations: KnowledgeCitation[];
  researchCitations: VerifiedResearchCitation[];
  limitations: string[];
  generatedAt: string;
}
