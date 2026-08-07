import * as SecureStore from "expo-secure-store";

import type {
  Discovery,
} from "@savewise/shared";

import {
  loadAppSettings,
} from "@/services/settings-storage";

const SESSION_KEY =
  "savewise.account.session.v1";

export type MobileCaptureFile = {
  uri: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
};

export type MobileCaptureType =
  | "pdf"
  | "image";

type FileCaptureResponse = {
  discovery: Discovery;

  knowledgeUpdate: {
    generatedAt: string;
    totalDiscoveries: number;
    totalTopics: number;
    totalInterests: number;
    totalRelations: number;
  };
};

export async function importMobileFile(
  input: {
    file: MobileCaptureFile;

    captureType:
      MobileCaptureType;

    preferredKnowledgePath?:
      string[];
  },
): Promise<Discovery> {
  const apiUrl =
    getApiUrl();

  const token =
    await SecureStore.getItemAsync(
      SESSION_KEY,
    );

  if (!token) {
    throw new Error(
      "Bitte melde dich zuerst bei SaveWise an.",
    );
  }

  const settings =
    await loadAppSettings();

  if (
    !settings.privacy
      .externalContentProcessing ||
    !settings.ai
      .contentAnalysis
  ) {
    throw new Error(
      "Die KI-Inhaltsanalyse ist in den Einstellungen deaktiviert.",
    );
  }

  const workspaceId =
    settings.workspace.activeId ===
      "business"
      ? "business"
      : "private";

  const preferredLanguage =
    resolveAnalysisLanguage(
      settings,
    );

  const formData =
    new FormData();

  /*
   * React Native FormData unterstützt
   * Dateiobjekte mit uri/name/type.
   *
   * TypeScript kennt diese native Form
   * nicht vollständig, deshalb wird sie
   * für die DOM-Typen als Blob behandelt.
   */
  formData.append(
    "file",
    {
      uri:
        input.file.uri,

      name:
        input.file.fileName,

      type:
        input.file.mimeType,
    } as unknown as Blob,
  );

  formData.append(
    "captureType",
    input.captureType,
  );

  formData.append(
    "workspaceId",
    workspaceId,
  );

  formData.append(
    "preferredLanguage",
    preferredLanguage,
  );

  formData.append(
    "preferredKnowledgePath",
    JSON.stringify(
      normalizeKnowledgePath(
        input.preferredKnowledgePath,
      ) ?? [],
    ),
  );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      120_000,
    );

  try {
    const response =
      await fetch(
        `${apiUrl}/api/capture/file`,
        {
          method:
            "POST",

          headers: {
            Accept:
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body:
            formData,

          signal:
            controller.signal,
        },
      );

    const body =
      await response
        .json()
        .catch(
          () => ({}),
        ) as
        Partial<
          FileCaptureResponse
        > & {
          error?:
            string;
        };

    if (
      !response.ok ||
      !body.discovery
    ) {
      throw new Error(
        translateCaptureError(
          body.error,
          response.status,
        ),
      );
    }

    return body.discovery;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      throw new Error(
        "Die Analyse hat länger als 120 Sekunden gedauert.",
      );
    }

    throw error;
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

function getApiUrl():
string {
  const apiUrl =
    process.env
      .EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL ist nicht konfiguriert.",
    );
  }

  return apiUrl.replace(
    /\/$/,
    "",
  );
}

function normalizeKnowledgePath(
  path:
    string[] | undefined,
):
  | string[]
  | undefined {
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
      .slice(
        0,
        3,
      );

  return normalized.length >
    0
    ? normalized
    : undefined;
}

function resolveAnalysisLanguage(
  settings:
    Awaited<
      ReturnType<
        typeof loadAppSettings
      >
    >,
):
  | "de"
  | "en"
  | "fr"
  | "it"
  | "es" {
  if (
    settings.language.input !==
    "auto"
  ) {
    return settings.language.input;
  }

  if (
    settings.language.display !==
    "system"
  ) {
    return settings.language.display;
  }

  return "de";
}

function translateCaptureError(
  code:
    string | undefined,

  status:
    number,
): string {
  switch (code) {
    case "SESSION_INVALID":
      return "Deine SaveWise-Anmeldung ist abgelaufen.";

    case "DROPBOX_NOT_CONNECTED":
      return "Dropbox ist noch nicht mit SaveWise verbunden.";

    case "PDF_HAS_NO_EXTRACTABLE_TEXT":
      return "Dieses PDF enthält keinen auslesbaren Text. Scan-PDFs ergänzen wir anschließend über Bilderkennung.";

    case "PDF_PAGE_LIMIT_EXCEEDED":
      return "Das PDF enthält mehr als 150 Seiten.";

    case "UNSUPPORTED_CAPTURE_FILE":
      return "Dieses Dateiformat wird nicht unterstützt.";

    case "CAPTURE_TYPE_MISMATCH":
      return "Die ausgewählte Datei passt nicht zur gewählten Importart.";

    case "CAPTURE_FILE_REQUIRED":
      return "Es wurde keine Datei übertragen.";

    default:
      return code
        ? `Importfehler: ${code}`
        : `Der Dateiimport ist fehlgeschlagen (${status}).`;
  }
}
