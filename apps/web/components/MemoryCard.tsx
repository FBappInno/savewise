"use client";

import { useState } from "react";
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
  
const [editing, setEditing] = useState(false);
const [title, setTitle] = useState(item.title);
const [url, setUrl] = useState(item.url);
const [notes, setNotes] = useState(item.notes ?? "");

const handleImportance = () => {
  const nextImportance =
    (item.importance ?? 0) >= 3
      ? 0
      : (item.importance ?? 0) + 1;

  onUpdate({
    ...item,
    importance: nextImportance,
  });
};

const handleSave = () => {
  onUpdate({
    ...item,
    title,
    url,
    notes,
  });

  setEditing(false);
};

    return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      
      <div className="flex items-center justify-between">

 {editing ? (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      className="w-full rounded-lg border px-3 py-2 text-lg"
    />
  ) : (
    <h3 className="text-lg font-medium">
      {item.title || "Untitled discovery"}
    </h3>
  )}

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
  {editing ? (
    <input
      value={url}
      onChange={(e) => setUrl(e.target.value)}
      className="w-full rounded-lg border px-3 py-2"
    />
  ) : (
    <span>{item.url}</span>
  )}
      </div>

      {item.summary && (
        <p className="mt-3 text-gray-600">
          {item.summary}
        </p>
      )}

    {editing ? (
  <textarea
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    className="mt-4 w-full rounded-lg border px-3 py-2 text-gray-700"
    rows={4}
  />
) : (
  item.notes && (
    <p className="mt-4 text-gray-700">
      {item.notes}
    </p>
  )
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

     <div className="mt-4 flex gap-4">
  {editing ? (
    <>
      <button
        onClick={handleSave}
        className="text-sm text-green-600 hover:text-green-800"
      >
        Save
      </button>

      <button
        onClick={() => setEditing(false)}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Cancel
      </button>
    </>
  ) : (
    <>
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-blue-500 hover:text-blue-700"
      >
        Edit
      </button>

      <button
        onClick={() => onDelete(item.id)}
        className="text-sm text-red-500 hover:text-red-700"
      >
        Delete
      </button>
    </>
  )}
</div>
    </div>
  );
}