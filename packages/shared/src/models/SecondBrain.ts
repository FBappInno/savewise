export interface KnowledgeCitation {
  discoveryId: string;
  title: string;
  url?: string;
  contribution: string;
}

export interface KnowledgeContradiction {
  title: string;
  explanation: string;
  discoveryIds: string[];
}

export interface KnowledgeAnswer {
  question: string;
  answer: string;
  confidence: number;
  relatedNodeIds: string[];
  citations: KnowledgeCitation[];
  contradictions: KnowledgeContradiction[];
  synthesis: KnowledgeSynthesis;
  insufficientKnowledge: string | null;
  generatedAt: string;
}

export interface KnowledgeSynthesis {
  overallInsight: string;
  sharedStatements: string[];
  differingStatements: string[];
  openQuestions: string[];
  practicalConclusions: string[];
}

export interface KnowledgeConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export type KnowledgeDocumentType =
  | "summary"
  | "learning-plan"
  | "presentation"
  | "blog-article"
  | "checklist"
  | "project-overview";

export interface KnowledgeDocumentSection {
  title: string;
  content: string;
  discoveryIds: string[];
}

export interface KnowledgeDocument {
  id: string;
  type: KnowledgeDocumentType;
  title: string;
  introduction: string;
  sections: KnowledgeDocumentSection[];
  citations: KnowledgeCitation[];
  limitations: string[];
  generatedAt: string;
}

export interface KnowledgeGap {
  id: string;
  title: string;
  description: string;
  relatedNodeIds: string[];
  suggestedTopics: string[];
  priority: number;
}

export interface KnowledgeEvolution {
  summary: string;
  newFocuses: string[];
  decliningFocuses: string[];
  developments: Array<{
    title: string;
    description: string;
    from: string;
    to: string;
    nodeIds: string[];
  }>;
}

export interface SecondBrainOverview {
  generatedAt: string;
  knowledgeSummary: string;
  gaps: KnowledgeGap[];
  evolution: KnowledgeEvolution;
  quality: KnowledgeQualityAssessment;
  profile: PersonalKnowledgeProfile;
}

export interface KnowledgeQualityDimension {
  score: number;
  summary: string;
}

export interface KnowledgeQualityAssessment {
  overallScore: number;
  completeness: KnowledgeQualityDimension;
  recency: KnowledgeQualityDimension;
  sourceDiversity: KnowledgeQualityDimension;
  trustworthiness: KnowledgeQualityDimension;
  contradictions: KnowledgeQualityDimension;
  redundancy: KnowledgeQualityDimension;
  findings: string[];
}

export interface PersonalKnowledgeProfile {
  interests: string[];
  projects: string[];
  learningGoals: string[];
  frequentQuestions: string[];
  developmentSummary: string;
  updatedAt: string;
}
