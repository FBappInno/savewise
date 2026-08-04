import type {
  StorageDataDomain,
  StorageTarget,
} from "@savewise/shared";

export type StorageObject = {
  domain: StorageDataDomain;
  key: string;
  value: string;
  updatedAt: string;
};

export interface StorageAdapter {
  readonly target: StorageTarget;
  read(domain: StorageDataDomain, key: string): Promise<StorageObject | null>;
  write(object: StorageObject): Promise<void>;
  remove(domain: StorageDataDomain, key: string): Promise<void>;
  list(domain: StorageDataDomain): Promise<StorageObject[]>;
  healthCheck(): Promise<boolean>;
}
