"use client";

import { useEffect, useState } from "react";

export default function MemoryList() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const storedItems = localStorage.getItem("savewise-items");

    if (storedItems) {
      const parsedItems = JSON.parse(storedItems);

      // neueste Erinnerungen zuerst
      setItems(parsedItems.reverse());
    }
  }, []);

  return (
    <div className="w-full max-w-xl mt-12">
      <h2 className="mb-6 text-2xl font-semibold">
        Your Memory
      </h2>

      {items.length === 0 && (
        <p className="text-gray-500">
          Your saved discoveries will appear here.
        </p>
      )}

      <div className="space-y-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-medium">
              {item.title || "Untitled discovery"}
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              {item.url}
            </p>

            {item.notes && (
              <p className="mt-4 text-gray-700">
                {item.notes}
              </p>
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