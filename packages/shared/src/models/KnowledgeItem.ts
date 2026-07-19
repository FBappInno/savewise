import type { KnowledgeSource } from "./KnowledgeSource";

export interface KnowledgeItem {
  id: string;
  title: string;
  source: KnowledgeSource;

  // ...
}