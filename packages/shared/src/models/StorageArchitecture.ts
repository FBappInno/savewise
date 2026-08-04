export const storageDataDomains = [
  "discoveries",
  "knowledge-graph",
  "embeddings",
  "ai-memory",
  "images",
  "offline-cache",
  "attachments",
  "settings",
] as const;

export type StorageDataDomain = typeof storageDataDomains[number];

export type StorageMode =
  | "local"
  | "bring-your-own-cloud"
  | "savewise-cloud";

export const externalStorageProviders = [
  "dropbox",
  "google-drive",
  "onedrive",
  "icloud-drive",
  "nextcloud",
  "synology-nas",
  "webdav",
] as const;

export type ExternalStorageProvider = typeof externalStorageProviders[number];

export type StorageConnectionStatus =
  | "local-only"
  | "not-configured"
  | "connection-required"
  | "connected"
  | "syncing"
  | "error";

export type StorageCapabilities = {
  offline: boolean;
  multiDeviceSync: boolean;
  automaticBackup: boolean;
  versionHistory: boolean;
  sharedLibraries: boolean;
  serverSideAgents: boolean;
};

export type StorageTarget = {
  mode: StorageMode;
  provider?: ExternalStorageProvider;
  status: StorageConnectionStatus;
  rootPath: string;
  capabilities: StorageCapabilities;
};

export type StorageManifest = {
  schemaVersion: 1;
  installationId: string;
  updatedAt: string;
  domains: Record<StorageDataDomain, {
    version: number;
    updatedAt: string | null;
  }>;
};

export type PortableSyncBundle = {
  schemaVersion: 1;
  exportedAt: string;
  sourceInstallationId: string;
  discoveries: import("./Discovery").Discovery[];
  knowledgeGraph: import("./KnowledgeGraph").KnowledgeGraph | null;
};

export type SyncImportResult = {
  importedAt: string;
  receivedDiscoveries: number;
  totalDiscoveries: number;
  addedDiscoveries: number;
  updatedDiscoveries: number;
};
