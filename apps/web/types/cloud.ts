import type {
  SyncImportResult,
} from "@savewise/shared";

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
