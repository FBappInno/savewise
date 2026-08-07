export type WorkspaceId =
  | "private"
  | "business";

export type DiscoverySource =
  | "youtube"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "web";

export type DiscoveryCaptureType =
  | "link"
  | "note"
  | "pdf"
  | "image"
  | "audio";

export type DiscoveryAttachment = {
  id: string;

  captureType:
    | "pdf"
    | "image"
    | "audio";

  fileName: string;
  mimeType: string;
  sizeBytes: number;

  /*
   * Pfad innerhalb des privaten
   * Dropbox-App-Ordners.
   */
  storagePath: string;

  pageCount?: number;
  width?: number;
  height?: number;
};

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
  /*
   * Technisches Legacy-Metadatum.
   * Nicht mehr als eigene Wissensebene anzeigen.
   */
  primaryCategory:
    DiscoveryCategory;

  /*
   * Bestimmt, ob der Wissenspfad von
   * SaveWise AI oder vom Benutzer stammt.
   *
   * Alte Discoveries ohne mode gelten als "ai".
   */
  mode?: "ai" | "manual";

  /*
   * Einheitlicher SaveWise-Wissenspfad:
   *
   * secondaryCategory = Galaxie
   * topic             = Planet
   * subtopics         = Sterne
   */
  secondaryCategory: string;
  topic: string;
  subtopics: string[];
}

export interface Discovery {
  id: string;

  workspaceId?: WorkspaceId;

  /*
   * Bestehende Discoveries ohne Wert
   * werden als Link behandelt.
   */
  captureType?:
    DiscoveryCaptureType;

  attachment?:
    DiscoveryAttachment;

  source: DiscoverySource;

  url?: string;

  title: string;
  improvedTitle?: string;
  description?: string;
  summary?: string;
  thumbnailUrl?: string;
  author?: string;
  publishedAt?: string;

  classification?:
    DiscoveryClassification;

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

  workspaceId:
    WorkspaceId;

  classification:
    DiscoveryClassification;

  language?:
    | "de"
    | "en"
    | "fr"
    | "it"
    | "es";
};
