import type {
  KnowledgeGraphRelationKind,
} from "./KnowledgeGraph";

export interface Relation {
  sourceId: string;

  targetId: string;

  strength: number;

  reason: string;

  kind?: KnowledgeGraphRelationKind;

  evidenceDiscoveryIds?: string[];
}