import type { KnowledgeItem } from "../models/KnowledgeItem";
import type { AIService } from "./AIService";

export class MockAIService implements AIService {
  async summarize(item: KnowledgeItem): Promise<string> {
    return `Summary of "${item.title}"`;
  }

  async keywords(item: KnowledgeItem): Promise<string[]> {
    return ["AI", "Knowledge", "Mock"];
  }

  async category(item: KnowledgeItem): Promise<string> {
    return "Technology";
  }

  async related(item: KnowledgeItem): Promise<string[]> {
    return [];
  }
}