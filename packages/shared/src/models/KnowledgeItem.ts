import type { KnowledgeSource } from "./KnowledgeSource";

export interface KnowledgeItem {
  id: string;

  title: string;
  summary?: string;
  notes?: string;

  source: KnowledgeSource;
  url: string;

  tags: string[];

  importance: number;

  status: "active" | "archived";

  createdAt: Date;
  updatedAt: Date;
}