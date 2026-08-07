import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";

import type {
  Discovery,
} from "@savewise/shared";

const SESSION_KEY =
  "savewise.account.session.v1";

export type DownloadedAttachment = {
  localUri: string;
  mimeType: string;
  fileName: string;
};

export async function downloadDiscoveryAttachment(
  discovery: Discovery,
): Promise<DownloadedAttachment> {
  if (!discovery.attachment) {
    throw new Error(
      "Für diese Discovery ist keine Originaldatei vorhanden.",
    );
  }

  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL
      ?.replace(
        /\/$/,
        "",
      );

  if (!apiUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL ist nicht konfiguriert.",
    );
  }

  const token =
    await SecureStore.getItemAsync(
      SESSION_KEY,
    );

  if (!token) {
    throw new Error(
      "Deine SaveWise-Anmeldung ist abgelaufen.",
    );
  }

  if (!FileSystem.cacheDirectory) {
    throw new Error(
      "Der lokale Dateicache ist nicht verfügbar.",
    );
  }

  const fileName =
    sanitizeFileName(
      discovery.attachment
        .fileName,
    );

  const localUri =
    `${FileSystem.cacheDirectory}savewise-${discovery.id}-${fileName}`;

  const result =
    await FileSystem.downloadAsync(
      `${apiUrl}/api/capture/attachments/${encodeURIComponent(
        discovery.id,
      )}`,
      localUri,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  if (
    result.status < 200 ||
    result.status >= 300
  ) {
    throw new Error(
      `Originaldatei konnte nicht geladen werden (${result.status}).`,
    );
  }

  return {
    localUri:
      result.uri,

    mimeType:
      discovery.attachment
        .mimeType,

    fileName,
  };
}

function sanitizeFileName(
  value: string,
): string {
  return (
    value
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      )
      .slice(
        0,
        120,
      ) ||
    "savewise-file"
  );
}
