"use client";

import { useEffect, useState } from "react";
import type { KnowledgeItem } from "@savewise/shared";
import MemoryCard from "@/components/MemoryCard";

interface MemoryListProps {
  search: string;
}

export default function MemoryList({
  search,
}: MemoryListProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);

  useEffect(() => {
    const storedItems = localStorage.getItem("savewise-items");

    if (storedItems) {
      setItems(JSON.parse(storedItems).reverse());
    }
  }, []);

  const handleDelete = (id: string) => {
    const updatedItems = items.filter(
      (item) => item.id !== id
    );

    setItems(updatedItems);

    localStorage.setItem(
      "savewise-items",
      JSON.stringify(updatedItems)
    );
  };

  const filteredItems = items.filter((item) => {
    const query = search.toLowerCase();

    return (
      (item.title ?? "").toLowerCase().includes(query) ||
      (item.notes ?? "").toLowerCase().includes(query) ||
      (item.url ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="w-full max-w-xl mt-12">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">
          Your Memory
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {filteredItems.length} discoveries
        </p>
      </div>

      {items.length === 0 && (
        <p className="text-gray-500">
          Your saved discoveries will appear here.
        </p>
      )}

      {items.length > 0 && filteredItems.length === 0 && (
        <p className="text-gray-500">
          No discoveries found.
        </p>
      )}

      <div className="space-y-5">
        {filteredItems.map((item) => (
          <MemoryCard
            key={item.id}
            item={item}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}