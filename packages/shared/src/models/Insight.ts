export type InsightKind =
  | "dominant-interest"
  | "recent-activity"
  | "emerging-topic"
  | "connected-topics"
  | "knowledge-gap";

export interface Insight {
  id: string;

  kind: InsightKind;

  title: string;

  description: string;

  score: number;

  topicIds: string[];

  discoveryIds: string[];

  generatedAt: string;
}

export interface KnowledgeActivity {
  totalDiscoveries: number;

  last7Days: number;

  last30Days: number;

  newTopicsLast30Days: number;
}