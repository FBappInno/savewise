import type {
  Discovery,
  DiscoveryCategory,
  WorkspaceId,
} from "@savewise/shared";

import {
  authenticatedFetch,
} from "@/services/account-client";

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
    contentType:
      | "html"
      | "pdf";
    fetchStrategy:
      | "standard"
      | "browser-compatible"
      | "url-derived";
  };

  analysis: {
    improvedTitle: string;
    summary: string;

    classification: {
      primaryCategory:
        DiscoveryCategory;
      secondaryCategory: string;
      topic: string;
      subtopics: string[];
    };

    keywords: string[];
    language: string;
    confidence: number;
  };

  organization: {
    primaryCategory:
      DiscoveryCategory;
    secondaryCategory: string;
    topic: string;
    subtopics: string[];
  };

  discovery: Discovery;
  knowledgeUpdate: KnowledgeUpdate;
};

type DiscoveriesResponse = {
  discoveries: Discovery[];
};

type ApiErrorResponse = {
  error?: string;
  code?: string;
  discoveryId?: string;
};

export async function getDiscoveries():
Promise<Discovery[]> {
  const response =
    await authenticatedFetch(
      "/api/discoveries",
      {
        method: "GET",
      },
    );

  const body =
    await readJson<
      DiscoveriesResponse &
      ApiErrorResponse
    >(response);

  if (
    !response.ok ||
    !Array.isArray(
      body.discoveries,
    )
  ) {
    throw new Error(
      body.error ??
      "Die Inhalte konnten nicht geladen werden.",
    );
  }

  return body.discoveries;
}

export async function importDiscoveryLink(
  input: {
    rawUrl: string;
    workspaceId: WorkspaceId;
    preferredLanguage?:
      | "de"
      | "en"
      | "fr"
      | "it"
      | "es";
    preferredKnowledgePath?: string[];
  },
): Promise<ImportResponse> {
  const url =
    normalizeDiscoveryUrl(
      input.rawUrl,
    );

  if (
    !isValidDiscoveryUrl(url)
  ) {
    throw new Error(
      "Bitte gib eine gültige Internetadresse ein.",
    );
  }

  const response =
    await authenticatedFetch(
      "/api/import",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            url,

            workspaceId:
              input.workspaceId,

            preferredLanguage:
              input.preferredLanguage ??
              "de",

            preferredKnowledgePath:
              normalizeKnowledgePath(
                input
                  .preferredKnowledgePath,
              ),
          }),
      },
    );

  const body =
    await readJson<
      ImportResponse &
      ApiErrorResponse
    >(response);

  if (!response.ok) {
    if (
      response.status === 409 ||
      body.code ===
        "duplicate_discovery"
    ) {
      throw new Error(
        body.error ??
        "Dieser Inhalt ist bereits in SaveWise vorhanden.",
      );
    }

    throw new Error(
      body.error ??
      `Der Import ist fehlgeschlagen (${response.status}).`,
    );
  }

  if (!body.discovery) {
    throw new Error(
      "Das Backend hat keine Discovery zurückgegeben.",
    );
  }

  return body as ImportResponse;
}

export async function deleteDiscovery(
  discoveryId: string,
): Promise<void> {
  const response =
    await authenticatedFetch(
      `/api/discoveries/${encodeURIComponent(
        discoveryId,
      )}`,
      {
        method: "DELETE",
      },
    );

  if (
    response.status === 204
  ) {
    return;
  }

  const body =
    await readJson<
      ApiErrorResponse
    >(response);

  if (!response.ok) {
    throw new Error(
      body.error ??
      "Der Inhalt konnte nicht gelöscht werden.",
    );
  }
}

export function normalizeDiscoveryUrl(
  rawUrl: string,
): string {
  const trimmedUrl =
    rawUrl.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (
    /^https?:\/\//i.test(
      trimmedUrl,
    )
  ) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

export function isValidDiscoveryUrl(
  rawUrl: string,
): boolean {
  const normalizedUrl =
    normalizeDiscoveryUrl(
      rawUrl,
    );

  if (!normalizedUrl) {
    return false;
  }

  try {
    const parsedUrl =
      new URL(
        normalizedUrl,
      );

    return (
      parsedUrl.protocol ===
        "http:" ||
      parsedUrl.protocol ===
        "https:"
    );
  } catch {
    return false;
  }
}

function normalizeKnowledgePath(
  path: string[] | undefined,
): string[] | undefined {
  if (!path) {
    return undefined;
  }

  const normalized =
    path
      .map(
        (part) =>
          part.trim(),
      )
      .filter(Boolean)
      .slice(0, 3);

  return normalized.length > 0
    ? normalized
    : undefined;
}

async function readJson<T>(
  response: Response,
): Promise<Partial<T>> {
  return response
    .json()
    .catch(
      () => ({}),
    ) as Promise<
      Partial<T>
    >;
}

export async function importDiscoveryFile(
  input: {
    file: File;

    captureType:
      | "pdf"
      | "image";

    workspaceId:
      WorkspaceId;

    preferredLanguage?:
      | "de"
      | "en"
      | "fr"
      | "it"
      | "es";

    preferredKnowledgePath?:
      string[];
  },
): Promise<{
  discovery: Discovery;
}> {
  const formData =
    new FormData();

  formData.append(
    "file",
    input.file,
  );

  formData.append(
    "captureType",
    input.captureType,
  );

  formData.append(
    "workspaceId",
    input.workspaceId,
  );

  formData.append(
    "preferredLanguage",
    input.preferredLanguage ??
      "de",
  );

  formData.append(
    "preferredKnowledgePath",
    JSON.stringify(
      input.preferredKnowledgePath ??
        [],
    ),
  );

  /*
   * Content-Type nicht manuell setzen.
   * Der Browser ergänzt automatisch
   * den notwendigen Multipart-Boundary.
   */
  const response =
    await authenticatedFetch(
      "/api/capture/file",
      {
        method:
          "POST",

        body:
          formData,
      },
    );

  const body =
    await readJson<{
      discovery:
        Discovery;

      error?: string;
    }>(response);

  if (
    !response.ok ||
    !body.discovery
  ) {
    throw new Error(
      translateFileCaptureError(
        body.error,
        response.status,
      ),
    );
  }

  return {
    discovery:
      body.discovery,
  };
}

function translateFileCaptureError(
  code: string | undefined,
  status: number,
): string {
  switch (code) {
    case "DROPBOX_NOT_CONNECTED":
      return "Verbinde zuerst Dropbox in den Einstellungen.";

    case "PDF_HAS_NO_EXTRACTABLE_TEXT":
      return "Dieses PDF enthält keinen auslesbaren Text. Es handelt sich wahrscheinlich um ein Scan-PDF.";

    case "PDF_PAGE_LIMIT_EXCEEDED":
      return "Das PDF enthält mehr als 150 Seiten und kann derzeit nicht importiert werden.";

    case "UNSUPPORTED_CAPTURE_FILE":
      return "Dieses Dateiformat wird nicht unterstützt.";

    case "CAPTURE_TYPE_MISMATCH":
      return "Die ausgewählte Datei passt nicht zur gewählten Importart.";

    case "SESSION_INVALID":
      return "Deine SaveWise-Anmeldung ist abgelaufen.";

    default:
      return code
        ? `Importfehler: ${code}`
        : `Der Dateiimport ist fehlgeschlagen (${status}).`;
  }
}

export async function loadDiscoveryAttachment(
  discoveryId: string,
): Promise<{
  blob: Blob;
  objectUrl: string;
}> {
  const response =
    await authenticatedFetch(
      `/api/capture/attachments/${encodeURIComponent(
        discoveryId,
      )}`,
      {
        method:
          "GET",
      },
    );

  if (!response.ok) {
    const body =
      await readJson<{
        error?: string;
      }>(response);

    throw new Error(
      translateAttachmentError(
        body.error,
        response.status,
      ),
    );
  }

  const blob =
    await response.blob();

  return {
    blob,

    objectUrl:
      URL.createObjectURL(
        blob,
      ),
  };
}

function translateAttachmentError(
  code: string | undefined,
  status: number,
): string {
  switch (code) {
    case "SESSION_INVALID":
      return "Deine SaveWise-Anmeldung ist abgelaufen.";

    case "DISCOVERY_NOT_FOUND":
      return "Dieser Inhalt wurde nicht gefunden.";

    case "DISCOVERY_ATTACHMENT_NOT_FOUND":
      return "Für diesen Inhalt wurde keine Originaldatei gefunden.";

    case "DROPBOX_NOT_CONNECTED":
      return "Dropbox ist nicht verbunden.";

    default:
      return code
        ? `Dateifehler: ${code}`
        : `Die Originaldatei konnte nicht geladen werden (${status}).`;
  }
}

