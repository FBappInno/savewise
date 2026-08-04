import AsyncStorage from "@react-native-async-storage/async-storage";

import type { StorageDataDomain, StorageTarget } from "@savewise/shared";
import type { StorageAdapter, StorageObject } from "./storage-adapter";

const PREFIX = "savewise.storage.v1";

export class LocalStorageAdapter implements StorageAdapter {
  readonly target: StorageTarget = {
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

  async read(domain: StorageDataDomain, key: string): Promise<StorageObject | null> {
    const value = await AsyncStorage.getItem(storageKey(domain, key));
    if (!value) return null;
    try {
      return JSON.parse(value) as StorageObject;
    } catch {
      return null;
    }
  }

  async write(object: StorageObject): Promise<void> {
    await AsyncStorage.setItem(
      storageKey(object.domain, object.key),
      JSON.stringify(object),
    );
  }

  async remove(domain: StorageDataDomain, key: string): Promise<void> {
    await AsyncStorage.removeItem(storageKey(domain, key));
  }

  async list(domain: StorageDataDomain): Promise<StorageObject[]> {
    const prefix = `${PREFIX}.${domain}.`;
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(prefix));
    if (keys.length === 0) return [];
    const values = await AsyncStorage.multiGet(keys);
    return values.flatMap(([, value]) => {
      if (!value) return [];
      try {
        return [JSON.parse(value) as StorageObject];
      } catch {
        return [];
      }
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      await AsyncStorage.getAllKeys();
      return true;
    } catch {
      return false;
    }
  }
}

function storageKey(domain: StorageDataDomain, key: string): string {
  return `${PREFIX}.${domain}.${encodeURIComponent(key)}`;
}
