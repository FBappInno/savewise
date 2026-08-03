import type { KnowledgeItem } from "../models/KnowledgeItem";

export interface AIService {
  summarize(item: KnowledgeItem): Promise<string>;

  keywords(item: KnowledgeItem): Promise<string[]>;

  category(item: KnowledgeItem): Promise<string>;

  related(item: KnowledgeItem): Promise<string[]>;
}