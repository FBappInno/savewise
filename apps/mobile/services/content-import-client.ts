import type {
  Discovery,
  DiscoveryCategory,
  DiscoveryUpdate,
  DiscoverySource,
  KnowledgeAnswer,
  KnowledgeConversationMessage,
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeLibrary,
  KnowledgeGraph,
  PersonalIntelligenceOverview,
  ResearchCandidateStatus,
  ResearchState,
  SecondBrainOverview,
  WorkAssistantRequest,
  WorkAssistantResult,
  PortableSyncBundle,
  SyncImportResult,
} from "@savewise/shared";
import { loadAppSettings } from "@/services/settings-storage";
import { getLocales } from "expo-localization";
import { classifyAnonymousError, trackAnonymousEvent } from "@/services/anonymous-analytics";

export type KnowledgeUpdate = {
  generatedAt: string;
  totalDiscoveries: number;
  totalTopics: number;
  totalInterests: number;
  totalRelations: number;
};

export type ImportResponse = {
  metadata: {
    url: string;
    title: string;
    description?: string;
    author?: string;
    thumbnailUrl?: string;
    siteName?: string;
    publishedAt?: string;
    contentType: "html" | "pdf";
    fetchStrategy: "standard" | "browser-compatible" | "url-derived";
  };

  analysis: {
    improvedTitle: string;
    summary: string;

    classification: {
      primaryCategory: DiscoveryCategory;
      secondaryCategory: string;
      topic: string;
      subtopics: string[];
    };

    keywords: string[];
    language: string;
    confidence: number;
  };

  organization: {
    primaryCategory: DiscoveryCategory;
    secondaryCategory: string;
    topic: string;
    subtopics: string[];
  };

  discovery: Discovery;
  knowledgeUpdate: KnowledgeUpdate;
};

export type DiscoveriesResponse = {
  discoveries: Discovery[];
};

export type DiscoveryResponse = {
  discovery: Discovery;
};

export type DiscoveryUpdateResponse = {
  discovery: Discovery;
  knowledgeUpdate: {
    generatedAt: string;
    totalDiscoveries: number;
    totalTopics: number;
    totalGraphNodes: number;
  };
};

export type RelatedDiscovery = {
  discovery: Discovery;
  score: number;
  reasons: string[];
};

export type RelatedDiscoveriesResponse = {
  discoveryId: string;
  related: RelatedDiscovery[];
};

function getApiUrl(): string {
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL ist nicht konfiguriert.",
    );
  }

  return apiUrl.replace(/\/$/, "");
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 30_000,
): Promise<T> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(
      `${getApiUrl()}${path}`,
      {
        ...options,

        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },

        signal: controller.signal,
      },
    );

    if (response.status === 204) {
      return undefined as T;
    }

    let body: unknown;

    try {
      body = await response.json();
    } catch {
      throw new Error(
        "Das Backend hat keine gültige JSON-Antwort geliefert.",
      );
    }

    if (!response.ok) {
      const errorMessage =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
          ? body.error
          : `Backend-Fehler ${response.status}.`;

      throw new Error(errorMessage);
    }

    return body as T;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        `Die Anfrage hat länger als ${
          timeoutMs / 1000
        } Sekunden gedauert.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function normalizeDiscoveryUrl(
  rawUrl: string,
): string {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (
    /^https?:\/\//i.test(trimmedUrl)
  ) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

export function isValidDiscoveryUrl(
  rawUrl: string,
): boolean {
  const normalizedUrl =
    normalizeDiscoveryUrl(rawUrl);

  if (!normalizedUrl) {
    return false;
  }

  try {
    const parsedUrl = new URL(
      normalizedUrl,
    );

    return (
      parsedUrl.protocol === "http:" ||
      parsedUrl.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export async function importContent(
  rawUrl: string,
  preferredKnowledgePath?: string[],
): Promise<ImportResponse> {
  const startedAt = Date.now();
  void trackAnonymousEvent("ImportStarted", { operation: "discovery-import" });
  const url =
    normalizeDiscoveryUrl(rawUrl);

  if (!isValidDiscoveryUrl(url)) {
    throw new Error("Bitte gib eine gültige Internetadresse ein.");
  }

  const settings = await loadAppSettings();
  if (
    !settings.privacy.externalContentProcessing ||
    !settings.ai.contentAnalysis
  ) {
    throw new Error(
      disabledAIMessage(settings.language.display),
    );
  }

  try {
    const result = await apiRequest<ImportResponse>(
      "/api/import",
      {
        method: "POST",
        body: JSON.stringify({
          url,
          preferredLanguage: resolveAnalysisLanguage(settings),
          preferredKnowledgePath: normalizeKnowledgePath(preferredKnowledgePath),
        }),
      },
      90_000,
    );
    const metrics = { durationMs: Date.now() - startedAt, operation: "discovery-import" as const };
    void trackAnonymousEvent("ImportFinished", metrics);
    void trackAnonymousEvent("DiscoveryCreated", metrics);
    return result;
  } catch (error) {
    void trackAnonymousEvent("ImportFailed", {
      durationMs: Date.now() - startedAt,
      operation: "discovery-import",
      errorKind: classifyAnonymousError(error),
    });
    throw error;
  }
}

function normalizeKnowledgePath(path: string[] | undefined): string[] | undefined {
  if (!path) return undefined;
  const normalized = path.map((part) => part.trim()).filter(Boolean).slice(0, 3);
  return normalized.length > 0 ? normalized : undefined;
}

function resolveAnalysisLanguage(
  settings: Awaited<ReturnType<typeof loadAppSettings>>,
): "de" | "en" | "fr" | "it" | "es" {
  if (settings.language.input !== "auto") {
    return settings.language.input;
  }

  if (settings.language.display !== "system") {
    return settings.language.display;
  }

  const deviceLanguage = getLocales()[0]?.languageCode;
  return deviceLanguage === "de" ||
    deviceLanguage === "fr" ||
    deviceLanguage === "it" ||
    deviceLanguage === "es"
    ? deviceLanguage
    : "en";
}

function disabledAIMessage(
  language: "system" | "de" | "en" | "fr" | "it" | "es",
): string {
  return {
    de: "Die externe KI-Inhaltsanalyse ist in den Einstellungen deaktiviert.",
    en: "External AI content analysis is disabled in Settings.",
    fr: "L’analyse externe des contenus par IA est désactivée dans les réglages.",
    it: "L’analisi esterna dei contenuti con IA è disattivata nelle impostazioni.",
    es: "El análisis externo de contenidos con IA está desactivado en los ajustes.",
    system: "External AI content analysis is disabled in Settings.",
  }[language];
}

export function getDiscoveries(): Promise<DiscoveriesResponse> {
  return apiRequest<DiscoveriesResponse>(
    "/api/discoveries",
  );
}

export function getDiscovery(
  discoveryId: string,
): Promise<DiscoveryResponse> {
  return apiRequest<DiscoveryResponse>(
    `/api/discoveries/${encodeURIComponent(
      discoveryId,
    )}`,
  );
}

export async function deleteDiscovery(
  discoveryId: string,
): Promise<void> {
  await apiRequest<void>(
    `/api/discoveries/${encodeURIComponent(
      discoveryId,
    )}`,
    {
      method: "DELETE",
    },
  );
  void trackAnonymousEvent("DiscoveryDeleted", { operation: "discovery-delete" });
}

export async function updateDiscovery(
  discoveryId: string,
  update: DiscoveryUpdate,
): Promise<DiscoveryUpdateResponse> {
  const result = await apiRequest<DiscoveryUpdateResponse>(
    `/api/discoveries/${encodeURIComponent(discoveryId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(update),
    },
    90_000,
  );
  void trackAnonymousEvent("DiscoveryEdited", { operation: "discovery-edit" });
  return result;
}

export function getKnowledgeLibrary(): Promise<KnowledgeLibrary> {
  return apiRequest<KnowledgeLibrary>(
    "/api/knowledge",
  );
}

export function exportSyncBundle(
  installationId: string,
): Promise<{ bundle: PortableSyncBundle }> {
  return apiRequest<{ bundle: PortableSyncBundle }>(
    "/api/storage/sync/export",
    { headers: { "X-SaveWise-Installation-Id": installationId } },
    90_000,
  );
}

export function importSyncBundle(
  bundle: PortableSyncBundle,
): Promise<{ result: SyncImportResult }> {
  return apiRequest<{ result: SyncImportResult }>(
    "/api/storage/sync/import",
    { method: "POST", body: JSON.stringify({ bundle }) },
    90_000,
  );
}

export function updateKnowledgeTopic(
  nodeId: string,
  update: { title: string; parentId: string | null },
): Promise<{ graph: KnowledgeGraph }> {
  return apiRequest<{ graph: KnowledgeGraph }>(
    `/api/knowledge/topics/${encodeURIComponent(nodeId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(update),
    },
    90_000,
  );
}

export function askKnowledgeQuestion(
  question: string,
  history: KnowledgeConversationMessage[] = [],
): Promise<KnowledgeAnswer> {
  return apiRequest<KnowledgeAnswer>(
    "/api/knowledge/ask",
    {
      method: "POST",
      body: JSON.stringify({
        question: question.trim(),
        history: history.slice(-12),
      }),
    },
    105_000,
  );
}

export function generateKnowledgeDocument(
  type: KnowledgeDocumentType,
  instruction: string,
): Promise<KnowledgeDocument> {
  return apiRequest<KnowledgeDocument>(
    "/api/knowledge/documents",
    {
      method: "POST",
      body: JSON.stringify({ type, instruction: instruction.trim() }),
    },
    115_000,
  );
}

export function getSecondBrainOverview(): Promise<SecondBrainOverview> {
  return apiRequest<SecondBrainOverview>(
    "/api/knowledge/second-brain",
    {},
    105_000,
  );
}

export function getResearchState(): Promise<ResearchState> {
  return apiRequest<ResearchState>("/api/research");
}

export function getPersonalIntelligenceOverview(): Promise<PersonalIntelligenceOverview> {
  return apiRequest<PersonalIntelligenceOverview>("/api/intelligence");
}

export function createPersonalWorkProduct(
  request: WorkAssistantRequest,
): Promise<WorkAssistantResult> {
  return apiRequest<WorkAssistantResult>(
    "/api/intelligence/work",
    { method: "POST", body: JSON.stringify(request) },
    110_000,
  );
}

export function runPersonalResearch(): Promise<ResearchState> {
  return apiRequest<ResearchState>(
    "/api/research/run",
    { method: "POST" },
    145_000,
  );
}

export function updateResearchCandidate(
  candidateId: string,
  status: Extract<ResearchCandidateStatus, "suggested" | "dismissed">,
): Promise<ResearchState> {
  return apiRequest<ResearchState>(
    `/api/research/candidates/${encodeURIComponent(candidateId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function saveResearchCandidate(
  candidateId: string,
): Promise<{
  discovery: Discovery;
  research: ResearchState | null;
}> {
  return apiRequest(
    `/api/research/candidates/${encodeURIComponent(candidateId)}/save`,
    { method: "POST" },
    100_000,
  );
}

export function rebuildKnowledgeLibrary(): Promise<{
  message: string;
  library: KnowledgeLibrary;
}> {
  return apiRequest<{
    message: string;
    library: KnowledgeLibrary;
  }>(
    "/api/knowledge/rebuild",
    {
      method: "POST",
    },
  );
}

export function getRelatedDiscoveries(
  discoveryId: string,
  limit = 5,
): Promise<RelatedDiscoveriesResponse> {
  return apiRequest<RelatedDiscoveriesResponse>(
    `/api/knowledge/related/${encodeURIComponent(
      discoveryId,
    )}?limit=${limit}`,
  );
}

export function detectDiscoverySource(
  rawUrl: string,
): DiscoverySource {
  const url =
    normalizeDiscoveryUrl(rawUrl);

  try {
    const hostname =
      new URL(url)
        .hostname
        .toLowerCase()
        .replace(/^www\./, "");

    if (
      hostname === "youtube.com" ||
      hostname.endsWith(
        ".youtube.com",
      ) ||
      hostname === "youtu.be"
    ) {
      return "youtube";
    }

    if (
      hostname === "instagram.com" ||
      hostname.endsWith(
        ".instagram.com",
      ) ||
      hostname === "ig.me"
    ) {
      return "instagram";
    }

    if (
      hostname === "facebook.com" ||
      hostname.endsWith(
        ".facebook.com",
      ) ||
      hostname === "fb.com" ||
      hostname.endsWith(
        ".fb.com",
      ) ||
      hostname === "fb.watch"
    ) {
      return "facebook";
    }

    if (
      hostname === "tiktok.com" ||
      hostname.endsWith(
        ".tiktok.com",
      )
    ) {
      return "tiktok";
    }

    return "web";
  } catch {
    return "web";
  }
}
