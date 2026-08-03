export type ContentCategory =
  | "technology"
  | "finance"
  | "business"
  | "science"
  | "health"
  | "education"
  | "productivity"
  | "culture"
  | "news"
  | "lifestyle"
  | "other";

export type KnowledgeClassification = {
  primaryCategory: ContentCategory;

  secondaryCategory: string;

  topic: string;

  subtopics: string[];
};

export type ContentAnalysis = {
  improvedTitle: string;

  summary: string;

  classification: KnowledgeClassification;

  keywords: string[];

  language: string;

  confidence: number;
};