export interface Discovery {
  id: string;

  url: string;

  title: string;

  improvedTitle: string;

  summary: string;

  primaryCategory: string;

  secondaryCategory: string;

  topic: string;

  subtopics: string[];

  keywords: string[];

  language: string;

  confidence: number;

  createdAt: string;

  updatedAt: string;
}