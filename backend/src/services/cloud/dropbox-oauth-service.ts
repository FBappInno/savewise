import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type {
  PortableSyncBundle,
} from "@savewise/shared";

import {
  runtimeConfig,
} from "../../config/runtime-config";

import {
  deleteDropboxConnection,
  getDropboxConnection,
  markDropboxSynced,
  readDropboxRefreshToken,
  saveDropboxConnection,
} from "./dropbox-connection-store";

const DROPBOX_AUTHORIZE_URL =
  "https://www.dropbox.com/oauth2/authorize";

const DROPBOX_TOKEN_URL =
  "https://api.dropboxapi.com/oauth2/token";

const DROPBOX_ACCOUNT_URL =
  "https://api.dropboxapi.com/2/users/get_current_account";

const DROPBOX_REVOKE_URL =
  "https://api.dropboxapi.com/2/auth/token/revoke";

const DROPBOX_DOWNLOAD_URL =
  "https://content.dropboxapi.com/2/files/download";

const DROPBOX_UPLOAD_URL =
  "https://content.dropboxapi.com/2/files/upload";

const DROPBOX_SYNC_PATH =
  "/savewise-sync-v1.json";

const STATE_TTL_MS =
  10 * 60 * 1_000;

type DropboxTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  account_id?: string;
  token_type: string;
};

type DropboxAccountResponse = {
  account_id: string;
  email?: string;
  name?: {
    display_name?: string;
  };
};

type OAuthStatePayload = {
  accountId: string;
  expiresAt: number;
  nonce: string;
};

export type DropboxConnectionStatus = {
  connected: boolean;
  displayName: string | null;
  accountEmail: string | null;
  lastSyncAt: string | null;
};

export function createDropboxAuthorizationUrl(
  saveWiseAccountId: string,
): string {
  assertDropboxConfigured();

  const state =
    createSignedState({
      accountId:
        saveWiseAccountId,

      expiresAt:
        Date.now() +
        STATE_TTL_MS,

      nonce:
        randomBytes(16)
          .toString("base64url"),
    });

  const parameters =
    new URLSearchParams({
      client_id:
        runtimeConfig.dropboxAppKey,

      redirect_uri:
        runtimeConfig.dropboxRedirectUri,

      response_type:
        "code",

      token_access_type:
        "offline",

      state,
    });

  return (
    `${DROPBOX_AUTHORIZE_URL}?` +
    parameters.toString()
  );
}

export async function completeDropboxAuthorization(
  code: string,
  state: string,
): Promise<{
  saveWiseAccountId: string;
  displayName: string;
}> {
  assertDropboxConfigured();

  const payload =
    verifySignedState(
      state,
    );

  const tokens =
    await exchangeAuthorizationCode(
      code,
    );

  if (!tokens.refresh_token) {
    throw new Error(
      "DROPBOX_REFRESH_TOKEN_MISSING",
    );
  }

  const account =
    await fetchDropboxAccount(
      tokens.access_token,
    );

  const displayName =
    account.name?.display_name ||
    account.email ||
    "Dropbox";

  await saveDropboxConnection({
    saveWiseAccountId:
      payload.accountId,

    dropboxAccountId:
      account.account_id,

    accountEmail:
      account.email ?? null,

    displayName,

    refreshToken:
      tokens.refresh_token,
  });

  return {
    saveWiseAccountId:
      payload.accountId,

    displayName,
  };
}

export async function getDropboxStatus(
  saveWiseAccountId: string,
): Promise<DropboxConnectionStatus> {
  const connection =
    await getDropboxConnection(
      saveWiseAccountId,
    );

  if (!connection) {
    return {
      connected: false,
      displayName: null,
      accountEmail: null,
      lastSyncAt: null,
    };
  }

  return {
    connected: true,

    displayName:
      connection.displayName,

    accountEmail:
      connection.accountEmail,

    lastSyncAt:
      connection.lastSyncAt,
  };
}

export async function disconnectDropboxAccount(
  saveWiseAccountId: string,
): Promise<void> {
  const connection =
    await getDropboxConnection(
      saveWiseAccountId,
    );

  if (!connection) {
    return;
  }

  try {
    const accessToken =
      await createAccessToken(
        readDropboxRefreshToken(
          connection,
        ),
      );

    await fetch(
      DROPBOX_REVOKE_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );
  } catch {
    /*
     * Die lokale Trennung muss auch funktionieren,
     * wenn Dropbox nicht erreichbar oder das Token
     * bereits widerrufen ist.
     */
  }

  await deleteDropboxConnection(
    saveWiseAccountId,
  );
}

export async function downloadDropboxBundle(
  saveWiseAccountId: string,
): Promise<PortableSyncBundle | null> {
  const accessToken =
    await getAccountAccessToken(
      saveWiseAccountId,
    );

  const response =
    await fetch(
      DROPBOX_DOWNLOAD_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Dropbox-API-Arg":
            JSON.stringify({
              path:
                DROPBOX_SYNC_PATH,
            }),
        },
      },
    );

  if (response.status === 409) {
    const details =
      await response.text();

    if (
      details.includes(
        "not_found",
      )
    ) {
      return null;
    }

    throw new Error(
      "DROPBOX_DOWNLOAD_CONFLICT",
    );
  }

  if (!response.ok) {
    throw new Error(
      `DROPBOX_DOWNLOAD_HTTP_${response.status}`,
    );
  }

  const value =
    await response.json() as
      Partial<PortableSyncBundle>;

  if (
    value.schemaVersion !== 1 ||
    !Array.isArray(
      value.discoveries,
    )
  ) {
    throw new Error(
      "DROPBOX_BUNDLE_INVALID",
    );
  }

  return value as
    PortableSyncBundle;
}

export async function uploadDropboxBundle(
  saveWiseAccountId: string,
  bundle: PortableSyncBundle,
): Promise<string> {
  const accessToken =
    await getAccountAccessToken(
      saveWiseAccountId,
    );

  const response =
    await fetch(
      DROPBOX_UPLOAD_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/octet-stream",

          "Dropbox-API-Arg":
            JSON.stringify({
              path:
                DROPBOX_SYNC_PATH,

              mode:
                "overwrite",

              autorename:
                false,

              mute:
                true,

              strict_conflict:
                false,
            }),
        },

        body:
          JSON.stringify(
            bundle,
          ),
      },
    );

  if (!response.ok) {
    const details =
      await response.text();

    console.error(
      "Dropbox upload failed:",
      details,
    );

    throw new Error(
      `DROPBOX_UPLOAD_HTTP_${response.status}`,
    );
  }

  const syncedAt =
    new Date().toISOString();

  await markDropboxSynced(
    saveWiseAccountId,
    syncedAt,
  );

  return syncedAt;
}

export async function downloadDropboxAttachment(
  saveWiseAccountId: string,
  storagePath: string,
): Promise<Buffer> {
  const accessToken =
    await getAccountAccessToken(
      saveWiseAccountId,
    );

  const response =
    await fetch(
      DROPBOX_DOWNLOAD_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Dropbox-API-Arg":
            JSON.stringify({
              path:
                storagePath,
            }),
        },
      },
    );

  if (!response.ok) {
    const details =
      await response.text();

    console.error(
      "Dropbox attachment download failed:",
      details,
    );

    throw new Error(
      `DROPBOX_ATTACHMENT_DOWNLOAD_HTTP_${response.status}`,
    );
  }

  return Buffer.from(
    await response.arrayBuffer(),
  );
}

export async function uploadDropboxAttachment(
  saveWiseAccountId: string,
  input: {
    path: string;
    bytes: Buffer;
  },
): Promise<void> {
  const accessToken =
    await getAccountAccessToken(
      saveWiseAccountId,
    );

  const response =
    await fetch(
      DROPBOX_UPLOAD_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/octet-stream",

          "Dropbox-API-Arg":
            JSON.stringify({
              path:
                input.path,

              mode:
                "overwrite",

              autorename:
                false,

              mute:
                true,

              strict_conflict:
                false,
            }),
        },

        body:
          new Uint8Array(
            input.bytes,
          ),
      },
    );

  if (!response.ok) {
    const details =
      await response.text();

    console.error(
      "Dropbox attachment upload failed:",
      details,
    );

    throw new Error(
      `DROPBOX_ATTACHMENT_UPLOAD_HTTP_${response.status}`,
    );
  }
}

async function getAccountAccessToken(
  saveWiseAccountId: string,
): Promise<string> {
  const connection =
    await getDropboxConnection(
      saveWiseAccountId,
    );

  if (!connection) {
    throw new Error(
      "DROPBOX_NOT_CONNECTED",
    );
  }

  return createAccessToken(
    readDropboxRefreshToken(
      connection,
    ),
  );
}

async function exchangeAuthorizationCode(
  code: string,
): Promise<DropboxTokenResponse> {
  const parameters =
    new URLSearchParams({
      code,

      grant_type:
        "authorization_code",

      client_id:
        runtimeConfig.dropboxAppKey,

      client_secret:
        runtimeConfig.dropboxAppSecret,

      redirect_uri:
        runtimeConfig.dropboxRedirectUri,
    });

  const response =
    await fetch(
      DROPBOX_TOKEN_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          parameters.toString(),
      },
    );

  if (!response.ok) {
    const details =
      await response.text();

    console.error(
      "Dropbox token exchange failed:",
      details,
    );

    throw new Error(
      `DROPBOX_TOKEN_HTTP_${response.status}`,
    );
  }

  return response.json() as
    Promise<DropboxTokenResponse>;
}

async function createAccessToken(
  refreshToken: string,
): Promise<string> {
  assertDropboxConfigured();

  const parameters =
    new URLSearchParams({
      refresh_token:
        refreshToken,

      grant_type:
        "refresh_token",

      client_id:
        runtimeConfig.dropboxAppKey,

      client_secret:
        runtimeConfig.dropboxAppSecret,
    });

  const response =
    await fetch(
      DROPBOX_TOKEN_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body:
          parameters.toString(),
      },
    );

  if (!response.ok) {
    const details =
      await response.text();

    console.error(
      "Dropbox token refresh failed:",
      details,
    );

    throw new Error(
      `DROPBOX_REFRESH_HTTP_${response.status}`,
    );
  }

  const result =
    await response.json() as
      DropboxTokenResponse;

  return result.access_token;
}

async function fetchDropboxAccount(
  accessToken: string,
): Promise<DropboxAccountResponse> {
  const response =
    await fetch(
      DROPBOX_ACCOUNT_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );

  if (!response.ok) {
    throw new Error(
      `DROPBOX_ACCOUNT_HTTP_${response.status}`,
    );
  }

  return response.json() as
    Promise<DropboxAccountResponse>;
}

function createSignedState(
  payload: OAuthStatePayload,
): string {
  const encodedPayload =
    Buffer.from(
      JSON.stringify(
        payload,
      ),
      "utf8",
    ).toString(
      "base64url",
    );

  const signature =
    signState(
      encodedPayload,
    );

  return [
    encodedPayload,
    signature,
  ].join(".");
}

function verifySignedState(
  state: string,
): OAuthStatePayload {
  const [
    encodedPayload,
    signature,
  ] =
    state.split(".");

  if (
    !encodedPayload ||
    !signature
  ) {
    throw new Error(
      "DROPBOX_STATE_INVALID",
    );
  }

  const expectedSignature =
    signState(
      encodedPayload,
    );

  const provided =
    Buffer.from(
      signature,
      "utf8",
    );

  const expected =
    Buffer.from(
      expectedSignature,
      "utf8",
    );

  if (
    provided.length !==
      expected.length ||
    !timingSafeEqual(
      provided,
      expected,
    )
  ) {
    throw new Error(
      "DROPBOX_STATE_INVALID",
    );
  }

  const payload =
    JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url",
      ).toString("utf8"),
    ) as Partial<OAuthStatePayload>;

  if (
    typeof payload.accountId !==
      "string" ||
    typeof payload.expiresAt !==
      "number" ||
    typeof payload.nonce !==
      "string" ||
    payload.expiresAt <
      Date.now()
  ) {
    throw new Error(
      "DROPBOX_STATE_EXPIRED",
    );
  }

  return payload as
    OAuthStatePayload;
}

function signState(
  encodedPayload: string,
): string {
  return createHmac(
    "sha256",
    runtimeConfig
      .dropboxTokenEncryptionKey,
  )
    .update(
      encodedPayload,
    )
    .digest(
      "base64url",
    );
}

function assertDropboxConfigured():
void {
  if (
    !runtimeConfig.dropboxAppKey ||
    !runtimeConfig.dropboxAppSecret ||
    !runtimeConfig.dropboxRedirectUri ||
    !runtimeConfig
      .dropboxTokenEncryptionKey
  ) {
    throw new Error(
      "DROPBOX_NOT_CONFIGURED",
    );
  }
}
