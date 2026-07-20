"use client";

import { useEffect, useState } from "react";
import type { KnowledgeItem } from "@savewise/shared";

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
      const parsedItems = JSON.parse(storedItems);

      // neueste Erinnerungen zuerst
      setItems(parsedItems.reverse());
    }
  }, []);

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
          <div
            key={item.id}
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-medium">
              {item.title || "Untitled discovery"}
            </h3>

           <div className="mt-3 text-sm text-gray-500">
  <span className="font-medium">
    {item.source}
  </span>

  <span className="mx-2">
    ·
  </span>

  <span>
    {item.url}
  </span>
</div>

{item.summary && (
  <p className="mt-3 text-gray-600">
    {item.summary}
  </p>
)}

            {item.notes && (
              <p className="mt-4 text-gray-700">
                {item.notes}
              </p>
            )}

            {item.tags && item.tags.length > 0 && (
  <div className="mt-4 flex flex-wrap gap-2">
    {item.tags.map((tag) => (
      <span
        key={tag}
        className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
      >
        #{tag}
      </span>
    ))}
  </div>
)}

            <div className="mt-5 text-sm text-gray-400">
              Saved on{" "}
                {new Date(item.createdAt).toLocaleDateString(
                 "en-US",
                {
                 year: "numeric",
                 month: "long",
                day: "numeric",
                }
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}