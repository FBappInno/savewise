export type PageMetadata = {
  url: string;
  title: string;
  description?: string;
  author?: string;
  thumbnailUrl?: string;
  siteName?: string;
  publishedAt?: string;
  extractedText?: string;
  mediaType?: "video";
  videoPlatform?: string;
  videoTranscript?: string;
  contentType: "html" | "pdf";
  fetchStrategy: "standard" | "browser-compatible";
};
