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
}
