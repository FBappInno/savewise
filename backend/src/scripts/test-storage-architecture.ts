import assert from "node:assert/strict";
import test from "node:test";

import {
  externalStorageProviders,
  storageDataDomains,
  type Discovery,
  type PortableSyncBundle,
  type StorageTarget,
} from "@savewise/shared";

import { InMemoryDiscoveryRepository } from "../repositories/in-memory-discovery-repository";
import { mergePortableSyncBundle } from "../services/storage/cloud-sync-service";

test("storage architecture keeps all personal knowledge domains portable", () => {
  assert.deepEqual(storageDataDomains, [
    "discoveries",
    "knowledge-graph",
    "embeddings",
    "ai-memory",
    "images",
    "offline-cache",
    "attachments",
    "settings",
  ]);
});

test("bring-your-own-cloud catalog covers open and hosted providers", () => {
  assert.ok(externalStorageProviders.includes("google-drive"));
  assert.ok(externalStorageProviders.includes("nextcloud"));
  assert.ok(externalStorageProviders.includes("synology-nas"));
  assert.ok(externalStorageProviders.includes("webdav"));
});

test("local target cannot advertise unavailable cloud capabilities", () => {
  const localTarget: StorageTarget = {
    mode: "local",
    status: "local-only",
    rootPath: "device://SaveWise",
    capabilities: {
      offline: true,
      multiDeviceSync: false,
      automaticBackup: false,
      versionHistory: false,
      sharedLibraries: false,
      serverSideAgents: false,
    },
  };

  assert.equal(localTarget.capabilities.offline, true);
  assert.equal(localTarget.capabilities.multiDeviceSync, false);
  assert.equal(localTarget.capabilities.serverSideAgents, false);
});

test("portable sync merges duplicate URLs and keeps the newest edit", async () => {
  const original = discovery({
    id: "local-id",
    title: "Alter Titel",
    updatedAt: "2026-08-01T10:00:00.000Z",
  });
  const repository = new InMemoryDiscoveryRepository([original]);
  const remote = discovery({
    id: "remote-id",
    title: "Neuer Titel",
    url: "https://example.com/article/?utm_source=cloud",
    updatedAt: "2026-08-03T10:00:00.000Z",
  });
  const bundle: PortableSyncBundle = {
    schemaVersion: 1,
    exportedAt: "2026-08-03T11:00:00.000Z",
    sourceInstallationId: "other-device",
    discoveries: [remote],
    knowledgeGraph: null,
  };

  const result = await mergePortableSyncBundle(repository, bundle);
  const stored = await repository.getAll();

  assert.equal(result.addedDiscoveries, 0);
  assert.equal(result.updatedDiscoveries, 1);
  assert.equal(stored.length, 1);
  assert.equal(stored[0]?.id, "local-id");
  assert.equal(stored[0]?.title, "Neuer Titel");
});

function discovery(overrides: Partial<Discovery>): Discovery {
  return {
    id: "discovery-id",
    source: "web",
    url: "https://example.com/article",
    title: "Titel",
    keywords: [],
    topics: [],
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
    savedAtLabel: "01.08.2026",
    ...overrides,
  };
}
