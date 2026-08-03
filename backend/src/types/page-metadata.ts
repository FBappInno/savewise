export type PageMetadata = {
  url: string;
  title: string;
  description?: string;
  author?: string;
  thumbnailUrl?: string;
  siteName?: string;
  publishedAt?: string;
  extractedText?: string;
  contentType: "html" | "pdf";
  fetchStrategy: "standard" | "browser-compatible";
};
