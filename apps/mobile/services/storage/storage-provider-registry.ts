import type {
  ExternalStorageProvider,
  StorageCapabilities,
  StorageMode,
  StorageTarget,
} from "@savewise/shared";

import { LocalStorageAdapter } from "./local-storage-adapter";
import type { StorageAdapter } from "./storage-adapter";

export type StorageProviderDefinition = {
  id: ExternalStorageProvider;
  rootPath: string;
  authentication: "oauth" | "platform" | "credentials";
};

export const storageProviderDefinitions: StorageProviderDefinition[] = [
  { id: "dropbox", rootPath: "/Apps/SaveWise", authentication: "oauth" },
  { id: "google-drive", rootPath: "/SaveWise", authentication: "oauth" },
  { id: "onedrive", rootPath: "/Apps/SaveWise", authentication: "oauth" },
  { id: "icloud-drive", rootPath: "/SaveWise", authentication: "platform" },
  { id: "nextcloud", rootPath: "/SaveWise", authentication: "credentials" },
  { id: "synology-nas", rootPath: "/SaveWise", authentication: "credentials" },
  { id: "webdav", rootPath: "/SaveWise", authentication: "credentials" },
];

const localAdapter = new LocalStorageAdapter();

export function getActiveStorageAdapter(): StorageAdapter {
  return localAdapter;
}

export function describeStorageTarget(
  mode: StorageMode,
  provider: ExternalStorageProvider | null,
): StorageTarget {
  if (mode === "local") return localAdapter.target;

  if (mode === "savewise-cloud") {
    return {
      mode,
      status: "connection-required",
      rootPath: "savewise-cloud://personal-library",
      capabilities: cloudCapabilities,
    };
  }

  const definition = storageProviderDefinitions.find((item) => item.id === provider);
  return {
    mode,
    provider: provider ?? undefined,
    status: "connection-required",
    rootPath: definition?.rootPath ?? "/SaveWise",
    capabilities: ownCloudCapabilities,
  };
}

const ownCloudCapabilities: StorageCapabilities = {
  offline: true,
  multiDeviceSync: true,
  automaticBackup: true,
  versionHistory: false,
  sharedLibraries: false,
  serverSideAgents: false,
};

const cloudCapabilities: StorageCapabilities = {
  offline: true,
  multiDeviceSync: true,
  automaticBackup: true,
  versionHistory: true,
  sharedLibraries: true,
  serverSideAgents: true,
};
