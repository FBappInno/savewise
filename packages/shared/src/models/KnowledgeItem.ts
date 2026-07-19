import type { KnowledgeSource } from "./KnowledgeSource";

export interface KnowledgeItem {
  id: string;
  title: string;
  source: KnowledgeSource;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  summary?: string;
  notes?: string;
  importance?: number;
  // ...
}