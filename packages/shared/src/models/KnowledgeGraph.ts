export type KnowledgeGraphNodeKind =
  | "domain"
  | "topic"
  | "subtopic"
  | "concept";

export type KnowledgeGraphRelationKind =
  | "related"
  | "supports"
  | "contrasts"
  | "depends-on"
  | "part-of"
  | "applies-to";

export interface KnowledgeGraphNode {
  id: string;

  title: string;

  kind: KnowledgeGraphNodeKind;

  description: string;

  parentId: string | null;

  childIds: string[];

  discoveryIds: string[];

  aliases: string[];

  keywords: string[];

  confidence: number;
}

export interface KnowledgeGraphRelation {
  id: string;

  sourceId: string;

  targetId: string;

  kind: KnowledgeGraphRelationKind;

  strength: number;

  reason: string;

  evidenceDiscoveryIds: string[];
}

export interface KnowledgeGraph {
  generatedAt: string;

  sourceFingerprint: string;

  language: string;

  summary: string;

  rootNodeIds: string[];

  nodes: KnowledgeGraphNode[];

  relations: KnowledgeGraphRelation[];
}