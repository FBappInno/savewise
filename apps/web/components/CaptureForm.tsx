"use client";

import { useState } from "react";

export default function CaptureForm() {
  const [saved, setSaved] = useState(false);

  function handleSave() {
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
    />

    <input
      className="mb-4 w-full rounded-lg border p-3"
      placeholder="Title"
      type="text"
    />

    <textarea
      className="mb-4 w-full rounded-lg border p-3"
      placeholder="Notes..."
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