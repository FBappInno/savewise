import {
  authenticatedFetch,
} from "@/services/account-client";

import type {
  DropboxConnectionStatus,
  DropboxSyncResult,
} from "@/types/cloud";

type DropboxStatusResponse = {
  connection:
    DropboxConnectionStatus;
};

type ApiErrorResponse = {
  error?: string;
};

export async function getDropboxStatus():
Promise<DropboxConnectionStatus> {
  const response =
    await authenticatedFetch(
      "/api/cloud/dropbox/status",
      {
        method: "GET",
      },
    );

  const body =
    await readJson<
      DropboxStatusResponse &
      ApiErrorResponse
    >(response);

  if (
    !response.ok ||
    !body.connection
  ) {
    throw new Error(
      translateDropboxError(
        body.error,
      ),
    );
  }

  return body.connection;
}

export async function synchronizeDropbox(
  installationId: string,
): Promise<DropboxSyncResult> {
  const response =
    await authenticatedFetch(
      "/api/cloud/dropbox/sync",
      {
        method: "POST",

        headers: {
          "X-SaveWise-Installation-Id":
            installationId,
        },
      },
    );

  const body =
    await readJson<
      DropboxSyncResult &
      ApiErrorResponse
    >(response);

  if (
    !response.ok ||
    !body.syncedAt
  ) {
    throw new Error(
      translateDropboxError(
        body.error,
      ),
    );
  }

  return body as
    DropboxSyncResult;
}

export async function disconnectDropbox():
Promise<void> {
  const response =
    await authenticatedFetch(
      "/api/cloud/dropbox",
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
      translateDropboxError(
        body.error,
      ),
    );
  }
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

function translateDropboxError(
  code?: string,
): string {
  switch (code) {
    case "DROPBOX_NOT_CONNECTED":
      return "Dropbox ist noch nicht mit diesem SaveWise-Konto verbunden.";

    case "SESSION_INVALID":
      return "Deine SaveWise-Anmeldung ist abgelaufen.";

    case "DROPBOX_NOT_CONFIGURED":
      return "Dropbox ist auf Railway noch nicht vollständig konfiguriert.";

    default:
      return code
        ? `Dropbox-Fehler: ${code}`
        : "Dropbox ist derzeit nicht erreichbar.";
  }
}
