import type {
  KnowledgeGraphNodeKind,
  KnowledgeGraphRelationKind,
} from "@savewise/shared";

export interface KnowledgeGraphAnalysisNode {
  key: string;

  title: string;

  kind: KnowledgeGraphNodeKind;

  description: string;

  parentKey: string | null;

  discoveryIds: string[];

  aliases: string[];

  keywords: string[];

  confidence: number;
}

export interface KnowledgeGraphAnalysisRelation {
  sourceKey: string;

  targetKey: string;

  kind: KnowledgeGraphRelationKind;

  strength: number;

  reason: string;

  evidenceDiscoveryIds: string[];
}

export interface KnowledgeGraphAnalysis {
  language: string;

  summary: string;

  nodes: KnowledgeGraphAnalysisNode[];

  relations: KnowledgeGraphAnalysisRelation[];
}