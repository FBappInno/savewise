export type KnowledgeInterest = {
  key: string;
  label: string;
  count: number;
  percentage: number;
};

export type KnowledgeInsights = {
  totalDiscoveries: number;
  interests: KnowledgeInterest[];
};