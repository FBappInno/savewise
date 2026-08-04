import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  exportSyncBundle,
  importSyncBundle,
} from "@/services/content-import-client";
import type { PortableSyncBundle, SyncImportResult } from "@savewise/shared";
import type { WebDavCredentials } from "./webdav-credentials";

const INSTALLATION_KEY = "savewise.installation-id.v1";
const SYNC_FILENAME = "savewise-sync-v1.json";

export type WebDavSyncResult = {
  syncedAt: string;
  uploadedDiscoveries: number;
  importResult: SyncImportResult | null;
};

export async function testWebDavConnection(
  credentials: WebDavCredentials,
): Promise<void> {
  const directoryUrl = syncDirectoryUrl(credentials.serverUrl);
  await ensureDirectory(directoryUrl, credentials);
  const response = await request(directoryUrl, credentials, {
    method: "PROPFIND",
    headers: { Depth: "0" },
  });
  if (!response.ok && response.status !== 207) {
    throw new Error(`WebDAV-Verbindung fehlgeschlagen (HTTP ${response.status}).`);
  }
  response.body?.cancel().catch(() => undefined);
}

export async function syncWithWebDav(
  credentials: WebDavCredentials,
): Promise<WebDavSyncResult> {
  const directoryUrl = syncDirectoryUrl(credentials.serverUrl);
  await ensureDirectory(directoryUrl, credentials);
  const fileUrl = new URL(SYNC_FILENAME, `${directoryUrl}/`).toString();
  let importResult: SyncImportResult | null = null;

  const remoteResponse = await request(fileUrl, credentials, { method: "GET" });
  if (remoteResponse.ok) {
    const remoteBundle = await parseRemoteBundle(remoteResponse);
    importResult = (await importSyncBundle(remoteBundle)).result;
  } else if (remoteResponse.status !== 404) {
    throw new Error(`Cloud-Datei konnte nicht gelesen werden (HTTP ${remoteResponse.status}).`);
  }

  const installationId = await getInstallationId();
  const bundle = (await exportSyncBundle(installationId)).bundle;
  const uploadResponse = await request(fileUrl, credentials, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bundle),
  });
  if (!uploadResponse.ok) {
    throw new Error(`Cloud-Datei konnte nicht gespeichert werden (HTTP ${uploadResponse.status}).`);
  }
  uploadResponse.body?.cancel().catch(() => undefined);

  return {
    syncedAt: new Date().toISOString(),
    uploadedDiscoveries: bundle.discoveries.length,
    importResult,
  };
}

function syncDirectoryUrl(rawServerUrl: string): string {
  const url = new URL(rawServerUrl.trim());
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Für Cloud-Synchronisation ist eine HTTPS-Adresse erforderlich.");
  }
  url.hash = "";
  url.search = "";
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/SaveWise`;
  return url.toString().replace(/\/$/, "");
}

async function ensureDirectory(
  directoryUrl: string,
  credentials: WebDavCredentials,
): Promise<void> {
  const response = await request(directoryUrl, credentials, { method: "MKCOL" });
  if (![201, 301, 302, 405].includes(response.status)) {
    throw new Error(`SaveWise-Ordner konnte nicht erstellt werden (HTTP ${response.status}).`);
  }
  response.body?.cancel().catch(() => undefined);
}

async function request(
  url: string,
  credentials: WebDavCredentials,
  options: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(url, {
      ...options,
      headers: {
        Authorization: `Basic ${base64(`${credentials.username}:${credentials.password}`)}`,
        ...options.headers,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Der Cloud-Server hat nicht rechtzeitig geantwortet.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseRemoteBundle(response: Response): Promise<PortableSyncBundle> {
  const parsed = await response.json() as Partial<PortableSyncBundle>;
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.discoveries)) {
    throw new Error("Die Cloud-Datei besitzt kein unterstütztes SaveWise-Format.");
  }
  return parsed as PortableSyncBundle;
}

async function getInstallationId(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (existing) return existing;
  const created = `device-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(INSTALLATION_KEY, created);
  return created;
}

function base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
}
