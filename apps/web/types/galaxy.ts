export type GalaxyNodeType =
  | "core"
  | "domain"
  | "topic";

export type GalaxyNode = {
  id: string;
  label: string;
  type: GalaxyNodeType;
  count: number;
  x: number;
  y: number;
  radius: number;
  parentId: string | null;
};

export type GalaxyConnection = {
  id: string;
  sourceId: string;
  targetId: string;
};
