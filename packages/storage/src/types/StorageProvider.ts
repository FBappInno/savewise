export interface StorageProvider<T> {
  save(item: T): Promise<void>;

  loadAll(): Promise<T[]>;

  update(item: T): Promise<void>;

  delete(id: string): Promise<void>;

  clear(): Promise<void>;
}