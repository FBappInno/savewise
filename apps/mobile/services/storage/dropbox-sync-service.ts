import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { exportSyncBundle, importSyncBundle } from "@/services/content-import-client";
import type { PortableSyncBundle, SyncImportResult } from "@savewise/shared";
import {
  deleteDropboxSession,
  loadDropboxSession,
  saveDropboxSession,
  type DropboxSession,
} from "./dropbox-credentials";

WebBrowser.maybeCompleteAuthSession();

const DROPBOX_DISCOVERY = {
  authorizationEndpoint: "https://www.dropbox.com/oauth2/authorize",
  tokenEndpoint: "https://api.dropboxapi.com/oauth2/token",
};
const DROPBOX_ACCOUNT_ENDPOINT = "https://api.dropboxapi.com/2/users/get_current_account";
const DROPBOX_REVOKE_ENDPOINT = "https://api.dropboxapi.com/2/auth/token/revoke";
const DROPBOX_DOWNLOAD_ENDPOINT = "https://content.dropboxapi.com/2/files/download";
const DROPBOX_UPLOAD_ENDPOINT = "https://content.dropboxapi.com/2/files/upload";
const DROPBOX_SYNC_PATH = "/savewise-sync-v1.json";
const INSTALLATION_KEY = "savewise.installation-id.v1";

export type DropboxConnection = {
  displayName: string;
  redirectUri: string;
};

export type DropboxSyncResult = {
  syncedAt: string;
  uploadedDiscoveries: number;
  importResult: SyncImportResult | null;
};

export function getDropboxAppKey(): string | null {
  return process.env.EXPO_PUBLIC_DROPBOX_APP_KEY?.trim() || null;
}

export function getDropboxRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    native: "savewise://oauth/dropbox",
    path: "oauth/dropbox",
    scheme: "savewise",
  });
}

export async function connectDropbox(appKey: string): Promise<DropboxConnection> {
  const redirectUri = getDropboxRedirectUri();
  const request = new AuthSession.AuthRequest({
    clientId: appKey,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: ["account_info.read", "files.content.read", "files.content.write"],
    usePKCE: true,
    extraParams: { token_access_type: "offline" },
  });
  await request.makeAuthUrlAsync(DROPBOX_DISCOVERY);
  const response = await request.promptAsync(DROPBOX_DISCOVERY);
  if (response.type !== "success" || !response.params.code) {
    throw new Error("Dropbox-Anmeldung wurde abgebrochen oder nicht bestätigt.");
  }
  if (!request.codeVerifier) {
    throw new Error("Die sichere Dropbox-Anmeldung konnte nicht vorbereitet werden.");
  }

  const token = await AuthSession.exchangeCodeAsync({
    clientId: appKey,
    code: response.params.code,
    redirectUri,
    extraParams: { code_verifier: request.codeVerifier },
  }, DROPBOX_DISCOVERY);
  if (!token.refreshToken) {
    throw new Error("Dropbox hat keinen Refresh-Token geliefert. Offline-Zugriff muss aktiviert sein.");
  }

  const account = await fetchDropboxAccount(token.accessToken);
  await saveDropboxSession({
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt: expiryDate(token.expiresIn),
    accountId: account.account_id,
    displayName: account.name?.display_name || account.email || "Dropbox",
  });
  return { displayName: account.name?.display_name || account.email || "Dropbox", redirectUri };
}

export async function testStoredDropboxConnection(appKey: string): Promise<DropboxConnection | null> {
  const session = await loadDropboxSession();
  if (!session) return null;
  const active = await activeSession(appKey, session);
  const account = await fetchDropboxAccount(active.accessToken);
  return { displayName: account.name?.display_name || account.email || active.displayName, redirectUri: getDropboxRedirectUri() };
}

export async function syncWithDropbox(appKey: string): Promise<DropboxSyncResult> {
  const stored = await loadDropboxSession();
  if (!stored) throw new Error("Dropbox ist nicht verbunden.");
  const session = await activeSession(appKey, stored);
  let importResult: SyncImportResult | null = null;
  const remote = await downloadBundle(session.accessToken);
  if (remote) importResult = (await importSyncBundle(remote)).result;

  const installationId = await getInstallationId();
  const bundle = (await exportSyncBundle(installationId)).bundle;
  await uploadBundle(session.accessToken, bundle);
  return {
    syncedAt: new Date().toISOString(),
    uploadedDiscoveries: bundle.discoveries.length,
    importResult,
  };
}

export async function disconnectDropbox(appKey: string): Promise<void> {
  const stored = await loadDropboxSession();
  if (stored) {
    try {
      const session = await activeSession(appKey, stored);
      await fetch(DROPBOX_REVOKE_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
    } catch {
      // Local removal must still work if Dropbox is unavailable or already revoked.
    }
  }
  await deleteDropboxSession();
}

async function activeSession(appKey: string, session: DropboxSession): Promise<DropboxSession> {
  if (new Date(session.expiresAt).getTime() > Date.now() + 60_000) return session;
  const refreshed = await AuthSession.refreshAsync({
    clientId: appKey,
    refreshToken: session.refreshToken,
  }, DROPBOX_DISCOVERY);
  const next = {
    ...session,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken || session.refreshToken,
    expiresAt: expiryDate(refreshed.expiresIn),
  };
  await saveDropboxSession(next);
  return next;
}

async function fetchDropboxAccount(accessToken: string): Promise<{
  account_id: string;
  email?: string;
  name?: { display_name?: string };
}> {
  const response = await fetch(DROPBOX_ACCOUNT_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Dropbox-Verbindung fehlgeschlagen (HTTP ${response.status}).`);
  return response.json();
}

async function downloadBundle(accessToken: string): Promise<PortableSyncBundle | null> {
  const response = await fetch(DROPBOX_DOWNLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path: DROPBOX_SYNC_PATH }),
    },
  });
  if (response.status === 409) {
    const details = await response.text();
    if (details.includes("not_found")) return null;
    throw new Error("Dropbox konnte die SaveWise-Datei nicht auflösen.");
  }
  if (!response.ok) throw new Error(`Dropbox-Datei konnte nicht gelesen werden (HTTP ${response.status}).`);
  const parsed = await response.json() as Partial<PortableSyncBundle>;
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.discoveries)) {
    throw new Error("Die Dropbox-Datei besitzt kein unterstütztes SaveWise-Format.");
  }
  return parsed as PortableSyncBundle;
}

async function uploadBundle(accessToken: string, bundle: PortableSyncBundle): Promise<void> {
  const response = await fetch(DROPBOX_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: DROPBOX_SYNC_PATH,
        mode: "overwrite",
        autorename: false,
        mute: true,
        strict_conflict: false,
      }),
    },
    body: JSON.stringify(bundle),
  });
  if (!response.ok) throw new Error(`Dropbox-Datei konnte nicht gespeichert werden (HTTP ${response.status}).`);
}

async function getInstallationId(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (existing) return existing;
  const created = `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(INSTALLATION_KEY, created);
  return created;
}

function expiryDate(expiresIn: number | undefined): string {
  return new Date(Date.now() + (expiresIn ?? 14_400) * 1_000).toISOString();
}
