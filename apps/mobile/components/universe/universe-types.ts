import type {
  KnowledgeGraphNode,
} from "@savewise/shared";

export type UniverseHierarchyLevel =
  | "domain"
  | "topic"
  | "subtopic";

export type UniversePoint = {
  x: number;
  y: number;
};

export type UniverseNodePlacement = {
  node:
    KnowledgeGraphNode;

  position:
    UniversePoint;

  level:
    UniverseHierarchyLevel;

  domainIndex:
    number;

  parentNodeId:
    string | null;

  isBackgroundNode:
    boolean;
};

export type UniverseConnectionPlacement = {
  id:
    string;

  from:
    UniversePoint;

  to:
    UniversePoint;

  level:
    UniverseHierarchyLevel;

  domainIndex:
    number;
};