import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import {
  readJsonFile,
  writeJsonFile,
} from "../../persistence/shared/json-file-store";

import {
  runtimeConfig,
} from "../../config/runtime-config";

import {
  storagePaths,
} from "../../config/storage-paths";

export type DropboxConnection = {
  accountId: string;
  accountEmail: string | null;
  displayName: string;
  encryptedRefreshToken: string;
  createdAt: string;
  updatedAt: string;
  lastSyncAt: string | null;
};

type StoredDropboxConnections =
  Record<string, DropboxConnection>;

export async function getDropboxConnection(
  saveWiseAccountId: string,
): Promise<DropboxConnection | null> {
  const connections =
    await loadConnections();

  return (
    connections[
      saveWiseAccountId
    ] ?? null
  );
}

export async function saveDropboxConnection(
  input: {
    saveWiseAccountId: string;
    dropboxAccountId: string;
    accountEmail?: string | null;
    displayName: string;
    refreshToken: string;
  },
): Promise<void> {
  const connections =
    await loadConnections();

  const existing =
    connections[
      input.saveWiseAccountId
    ];

  const now =
    new Date().toISOString();

  connections[
    input.saveWiseAccountId
  ] = {
    accountId:
      input.dropboxAccountId,

    accountEmail:
      input.accountEmail ?? null,

    displayName:
      input.displayName,

    encryptedRefreshToken:
      encryptSecret(
        input.refreshToken,
      ),

    createdAt:
      existing?.createdAt ??
      now,

    updatedAt:
      now,

    lastSyncAt:
      existing?.lastSyncAt ??
      null,
  };

  await saveConnections(
    connections,
  );
}

export async function deleteDropboxConnection(
  saveWiseAccountId: string,
): Promise<void> {
  const connections =
    await loadConnections();

  delete connections[
    saveWiseAccountId
  ];

  await saveConnections(
    connections,
  );
}

export function readDropboxRefreshToken(
  connection: DropboxConnection,
): string {
  return decryptSecret(
    connection.encryptedRefreshToken,
  );
}

export async function markDropboxSynced(
  saveWiseAccountId: string,
  syncedAt: string,
): Promise<void> {
  const connections =
    await loadConnections();

  const connection =
    connections[
      saveWiseAccountId
    ];

  if (!connection) {
    return;
  }

  connection.lastSyncAt =
    syncedAt;

  connection.updatedAt =
    new Date().toISOString();

  await saveConnections(
    connections,
  );
}

async function loadConnections():
Promise<StoredDropboxConnections> {
  return readJsonFile(
    storagePaths.dropboxConnections,

    () => ({}),

    isStoredDropboxConnections,
  );
}

async function saveConnections(
  connections:
    StoredDropboxConnections,
): Promise<void> {
  await writeJsonFile(
    storagePaths.dropboxConnections,
    connections,
    false,
  );
}

function encryptSecret(
  value: string,
): string {
  const key =
    getEncryptionKey();

  const iv =
    randomBytes(12);

  const cipher =
    createCipheriv(
      "aes-256-gcm",
      key,
      iv,
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        value,
        "utf8",
      ),

      cipher.final(),
    ]);

  const authenticationTag =
    cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authenticationTag.toString(
      "base64url",
    ),
    encrypted.toString(
      "base64url",
    ),
  ].join(".");
}

function decryptSecret(
  encryptedValue: string,
): string {
  const [
    ivValue,
    authenticationTagValue,
    encryptedDataValue,
  ] =
    encryptedValue.split(".");

  if (
    !ivValue ||
    !authenticationTagValue ||
    !encryptedDataValue
  ) {
    throw new Error(
      "DROPBOX_TOKEN_INVALID",
    );
  }

  const decipher =
    createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(),
      Buffer.from(
        ivValue,
        "base64url",
      ),
    );

  decipher.setAuthTag(
    Buffer.from(
      authenticationTagValue,
      "base64url",
    ),
  );

  return Buffer.concat([
    decipher.update(
      Buffer.from(
        encryptedDataValue,
        "base64url",
      ),
    ),

    decipher.final(),
  ]).toString("utf8");
}

function getEncryptionKey():
Buffer {
  const configured =
    runtimeConfig
      .dropboxTokenEncryptionKey;

  if (!configured) {
    throw new Error(
      "DROPBOX_TOKEN_ENCRYPTION_KEY_MISSING",
    );
  }

  /*
   * Akzeptiert den zuvor mit
   * `openssl rand -hex 32`
   * erstellten Schlüssel.
   */
  if (
    /^[a-fA-F0-9]{64}$/.test(
      configured,
    )
  ) {
    return Buffer.from(
      configured,
      "hex",
    );
  }

  return createHash("sha256")
    .update(configured)
    .digest();
}

function isStoredDropboxConnections(
  value: unknown,
): value is StoredDropboxConnections {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  return Object.values(
    value,
  ).every(
    (connection) =>
      Boolean(connection) &&
      typeof connection ===
        "object" &&
      typeof (
        connection as
          DropboxConnection
      ).accountId ===
        "string" &&
      typeof (
        connection as
          DropboxConnection
      ).displayName ===
        "string" &&
      typeof (
        connection as
          DropboxConnection
      ).encryptedRefreshToken ===
        "string",
  );
}
