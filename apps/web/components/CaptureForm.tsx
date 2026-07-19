"use client";

import { useState } from "react";

export default function CaptureForm() {
  const [saved, setSaved] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  function handleSave() {
  const item = {
    id: crypto.randomUUID(),
    title,
    source: "web",
    url,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    notes,
    importance: 0,
  };

  localStorage.setItem(
    "savewise-items",
    JSON.stringify([item])
  );

  setSaved(true);
}

  return (
  <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-sm">
    <h2 className="mb-6 text-xl font-medium">
      Capture something worth remembering
    </h2>

    <input
      className="mb-4 w-full rounded-lg border p-3"
      placeholder="Paste a link..."
      type="url"
      value={url}
      onChange={(e) => setUrl(e.target.value)}
    />

    <input
      className="mb-4 w-full rounded-lg border p-3"
      placeholder="Title"
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
    />

    <textarea
      className="mb-4 w-full rounded-lg border p-3"
      placeholder="Notes..."
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
    />

    <button
      className="rounded-lg bg-black px-6 py-3 text-white"
      onClick={handleSave}
    >
      Save
    </button>

    {saved && (
      <p className="mt-4">
        ✓ Saved to your knowledge space
      </p>
    )}
  </div>
);

}