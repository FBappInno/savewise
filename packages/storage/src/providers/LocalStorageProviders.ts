import { StorageProvider } from "../types/StorageProvider";

export class LocalStorageProvider<T> implements StorageProvider<T> {
  constructor(private readonly storageKey: string) {}

  async save(item: T): Promise<void> {
    const items = await this.loadAll();
    items.push(item);

    localStorage.setItem(
      this.storageKey,
      JSON.stringify(items)
    );
  }

  async loadAll(): Promise<T[]> {
    const data = localStorage.getItem(this.storageKey);

    if (!data) {
      return [];
    }

    return JSON.parse(data);
  }

  async update(item: T): Promise<void> {
    throw new Error("update() not implemented yet.");
  }

  async delete(id: string): Promise<void> {
    throw new Error("delete() not implemented yet.");
  }

  async clear(): Promise<void> {
    localStorage.removeItem(this.storageKey);
  }
}