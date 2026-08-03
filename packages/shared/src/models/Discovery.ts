export type DiscoverySource =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "web";

export type DiscoveryCategory =
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

export interface DiscoveryClassification {
  primaryCategory: DiscoveryCategory;
  secondaryCategory: string;
  topic: string;
  subtopics: string[];
}

export interface Discovery {
  id: string;

  source: DiscoverySource;

  url?: string;

  title: string;

  improvedTitle?: string;

  description?: string;

  summary?: string;

  thumbnailUrl?: string;

  author?: string;

  publishedAt?: string;

  classification?: DiscoveryClassification;

  keywords: string[];

  language?: string;

  confidence?: number;

  topics: string[];

  createdAt: string;

  updatedAt: string;

  savedAtLabel: string;
}

export type DiscoveryUpdate = {
  title: string;
  summary: string;
  classification: DiscoveryClassification;
  language?: "de" | "en" | "fr" | "it" | "es";
};
