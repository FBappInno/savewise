"use client";

import { useEffect, useState } from "react";

export default function MemoryList() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const storedItems = localStorage.getItem("savewise-items");

    if (storedItems) {
      setItems(JSON.parse(storedItems));
    }
  }, []);

  return (
    <div className="w-full max-w-xl mt-8">
      <h2 className="mb-4 text-xl font-medium">
        Your Memory
      </h2>

      {items.length === 0 && (
        <p className="text-gray-500">
          No memories yet.
        </p>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className="mb-4 rounded-2xl bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-medium">
            {item.title}
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            {item.url}
          </p>

          {item.notes && (
            <p className="mt-3">
              {item.notes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}