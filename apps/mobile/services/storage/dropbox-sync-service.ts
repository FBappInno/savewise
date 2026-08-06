import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import type {
  SyncImportResult,
} from "@savewise/shared";

import {
  getStoredAccountSessionToken,
} from "@/services/account-client";

WebBrowser.maybeCompleteAuthSession();

export type DropboxConnection = {
  displayName: string;
  redirectUri: string;
  accountEmail?: string | null;
};

export type DropboxConnectionStatus = {
  connected: boolean;
  displayName: string | null;
  accountEmail: string | null;
  lastSyncAt: string | null;
};

export type DropboxSyncResult = {
  syncedAt: string;
  uploadedDiscoveries: number;
  importResult:
    SyncImportResult | null;
};

type DropboxConnectResponse = {
  authorizationUrl: string;
};

type DropboxStatusResponse = {
  connection:
    DropboxConnectionStatus;
};

export function getDropboxAppKey():
string | null {
  /*
   * Der Dropbox App Key liegt nun ausschließlich
   * auf Railway. Ein öffentlicher App-Key in der
   * mobilen Anwendung ist nicht mehr nötig.
   *
   * Der Rückgabewert bleibt vorerst bestehen,
   * damit ältere UI-Stellen nicht sofort brechen.
   */
  return "railway-managed";
}

export function getDropboxRedirectUri():
string {
  return AuthSession.makeRedirectUri({
    native:
      "savewise://oauth/dropbox",

    path:
      "oauth/dropbox",

    scheme:
      "savewise",
  });
}

export async function connectDropbox(
  _legacyAppKey?: string,
): Promise<DropboxConnection> {
  const redirectUri =
    getDropboxRedirectUri();

  const result =
    await cloudRequest<
      DropboxConnectResponse
    >(
      "/api/cloud/dropbox/connect",
      {
        method: "GET",
      },
    );

  const browserResult =
    await WebBrowser.openAuthSessionAsync(
      result.authorizationUrl,
      redirectUri,
    );

  if (
    browserResult.type !==
      "success"
  ) {
    throw new Error(
      "Dropbox-Anmeldung wurde abgebrochen oder nicht abgeschlossen.",
    );
  }

  const callbackUrl =
    new URL(
      browserResult.url,
    );

  const callbackStatus =
    callbackUrl.searchParams.get(
      "dropbox",
    );

  if (
    callbackStatus !==
      "connected"
  ) {
    throw new Error(
      "Dropbox konnte nicht mit SaveWise verbunden werden.",
    );
  }

  const connection =
    await getDropboxConnectionStatus();

  if (!connection.connected) {
    throw new Error(
      "Railway hat die Dropbox-Verbindung nicht bestätigt.",
    );
  }

  return {
    displayName:
      connection.displayName ??
      "Dropbox",

    accountEmail:
      connection.accountEmail,

    redirectUri,
  };
}

export async function testStoredDropboxConnection(
  _legacyAppKey?: string,
): Promise<DropboxConnection | null> {
  const connection =
    await getDropboxConnectionStatus();

  if (!connection.connected) {
    return null;
  }

  return {
    displayName:
      connection.displayName ??
      "Dropbox",

    accountEmail:
      connection.accountEmail,

    redirectUri:
      getDropboxRedirectUri(),
  };
}

export async function getDropboxConnectionStatus():
Promise<DropboxConnectionStatus> {
  const result =
    await cloudRequest<
      DropboxStatusResponse
    >(
      "/api/cloud/dropbox/status",
      {
        method: "GET",
      },
    );

  return result.connection;
}

export async function syncWithDropbox(
  _legacyAppKey?: string,
): Promise<DropboxSyncResult> {
  const installationId =
    await getInstallationId();

  return cloudRequest<
    DropboxSyncResult
  >(
    "/api/cloud/dropbox/sync",
    {
      method: "POST",

      headers: {
        "X-SaveWise-Installation-Id":
          installationId,
      },
    },
  );
}

export async function disconnectDropbox(
  _legacyAppKey?: string,
): Promise<void> {
  await cloudRequest<void>(
    "/api/cloud/dropbox",
    {
      method: "DELETE",
    },
  );
}

async function cloudRequest<T>(
  path: string,
  options: RequestInit,
): Promise<T> {
  const apiUrl =
    process.env
      .EXPO_PUBLIC_API_URL
      ?.trim()
      .replace(
        /\/+$/,
        "",
      );

  if (!apiUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL ist nicht konfiguriert.",
    );
  }

  const sessionToken =
    await getStoredAccountSessionToken();

  if (!sessionToken) {
    throw new Error(
      "Für Dropbox ist eine aktive SaveWise-Anmeldung erforderlich.",
    );
  }

  const response =
    await fetch(
      `${apiUrl}${path}`,
      {
        ...options,

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${sessionToken}`,

          ...options.headers,
        },
      },
    );

  if (
    response.status ===
      204
  ) {
    return undefined as T;
  }

  const body =
    await response
      .json()
      .catch(
        () => ({}),
      ) as {
        error?: string;
      } & T;

  if (!response.ok) {
    throw new Error(
      body.error ??
      `DROPBOX_HTTP_${response.status}`,
    );
  }

  return body;
}

async function getInstallationId():
Promise<string> {
  const {
    default:
      AsyncStorage,
  } =
    await import(
      "@react-native-async-storage/async-storage"
    );

  const key =
    "savewise.installation-id.v1";

  const existing =
    await AsyncStorage.getItem(
      key,
    );

  if (existing) {
    return existing;
  }

  const created =
    [
      "device",
      Date.now(),
      Math.random()
        .toString(36)
        .slice(2, 12),
    ].join("-");

  await AsyncStorage.setItem(
    key,
    created,
  );

  return created;
}
