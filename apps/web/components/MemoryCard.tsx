"use client";

import type { KnowledgeItem } from "@savewise/shared";

interface MemoryCardProps {
  item: KnowledgeItem;
  onDelete: (id: string) => void;
  onUpdate: (item: KnowledgeItem) => void;
}

export default function MemoryCard({
  item,
  onDelete,
  onUpdate,
}: MemoryCardProps) {
  
  const handleImportance = () => {
  const nextImportance =
    item.importance >= 3 ? 0 : item.importance + 1;

  onUpdate({
    ...item,
    importance: nextImportance,
  });
};

    return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      
      <div className="flex items-center justify-between">
  <h3 className="text-lg font-medium">
    {item.title || "Untitled discovery"}
  </h3>

 <button
  onClick={handleImportance}
  className="text-yellow-500 hover:scale-110 transition"
>
  {item.importance > 0
    ? "⭐".repeat(item.importance)
    : "☆"}
</button>

</div>

      <div className="mt-3 text-sm text-gray-500">
        <span className="font-medium">
          {item.source}
        </span>

        <span className="mx-2">·</span>

        <span>{item.url}</span>
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

      {item.tags.length > 0 && (
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

      <button
        onClick={() => onDelete(item.id)}
        className="mt-4 rounded-lg px-3 py-1 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600"
      >
        Delete
      </button>
    </div>
  );
}