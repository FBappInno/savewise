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

export type DiscoveryClassification = {
  primaryCategory: DiscoveryCategory;

  secondaryCategory: string;

  topic: string;

  subtopics: string[];
};

export type Discovery = {
  id: string;

  title: string;

  source: DiscoverySource;

  url?: string;

  description?: string;

  summary?: string;

  thumbnailUrl?: string;

  author?: string;

  publishedAt?: string;

  classification?: DiscoveryClassification;

  keywords?: string[];

  language?: string;

  confidence?: number;

  topics: string[];

  createdAt: string;

  updatedAt: string;

  savedAtLabel: string;
};