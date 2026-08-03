"use client";

import { useState } from "react";

import MemoryCard from "@/components/MemoryCard";
import type { KnowledgeItem } from "@savewise/shared";

interface MemoryListProps {
  search: string;
}

const STORAGE_KEY = "savewise-items";

function loadStoredItems(): KnowledgeItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedItems = window.localStorage.getItem(STORAGE_KEY);

    if (!storedItems) {
      return [];
    }

    const parsedItems: unknown = JSON.parse(storedItems);

    if (!Array.isArray(parsedItems)) {
      return [];
    }

    return [...parsedItems].reverse() as KnowledgeItem[];
  } catch (error) {
    console.error("Failed to load stored discoveries:", error);
    return [];
  }
}

function saveStoredItems(items: KnowledgeItem[]): void {
  try {
    /*
     * Die Anzeige ist newest-first.
     * Im LocalStorage speichern wir wieder oldest-first,
     * damit die bisherige Reihenfolge erhalten bleibt.
     */
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...items].reverse()),
    );
  } catch (error) {
    console.error("Failed to save discoveries:", error);
  }
}

export default function MemoryList({
  search,
}: MemoryListProps) {
  const [items, setItems] =
    useState<KnowledgeItem[]>(loadStoredItems);

  const handleDelete = (id: string) => {
    setItems((currentItems) => {
      const updatedItems = currentItems.filter(
        (item) => item.id !== id,
      );

      saveStoredItems(updatedItems);

      return updatedItems;
    });
  };

  const handleUpdate = (
    updatedItem: KnowledgeItem,
  ) => {
    setItems((currentItems) => {
      const updatedItems = currentItems.map((item) =>
        item.id === updatedItem.id
          ? updatedItem
          : item,
      );

      saveStoredItems(updatedItems);

      return updatedItems;
    });
  };

  const normalizedSearch = search
    .trim()
    .toLocaleLowerCase();

  const filteredItems = items.filter((item) => {
    if (!normalizedSearch) {
      return true;
    }

    return (
      (item.title ?? "")
        .toLocaleLowerCase()
        .includes(normalizedSearch) ||
      (item.notes ?? "")
        .toLocaleLowerCase()
        .includes(normalizedSearch) ||
      (item.url ?? "")
        .toLocaleLowerCase()
        .includes(normalizedSearch)
    );
  });

  return (
    <section className="mt-12 w-full max-w-xl">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">
          Your Memory
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {filteredItems.length}{" "}
          {filteredItems.length === 1
            ? "discovery"
            : "discoveries"}
        </p>
      </header>

      {items.length === 0 ? (
        <p className="text-gray-500">
          Your saved discoveries will appear here.
        </p>
      ) : null}

      {items.length > 0 &&
      filteredItems.length === 0 ? (
        <p className="text-gray-500">
          No discoveries found.
        </p>
      ) : null}

      <div className="space-y-5">
        {filteredItems.map((item) => (
          <MemoryCard
            key={item.id}
            item={item}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
          />
        ))}
      </div>
    </section>
  );
}