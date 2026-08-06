"use client";

import {
  useState,
} from "react";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

export function LinkCaptureForm({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: () => void;
}) {
  const {
    activeWorkspaceId,
  } =
    useWorkspace();

  const [
    url,
    setUrl,
  ] =
    useState("");

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    isImporting,
    setImporting,
  ] =
    useState(false);

  async function handleImport() {
    if (!url.trim()) {
      return;
    }

    setImporting(true);

    try {
      /*
       * Im nächsten Schritt wird hier
       * dieselbe Railway-Import-API wie
       * auf dem iPhone angeschlossen.
       */
      console.log({
        type: "link",
        url:
          url.trim(),
        notes:
          notes.trim() ||
          undefined,
        workspaceId:
          activeWorkspaceId,
      });

      onComplete();
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="capture-form">
      <button
        className="capture-back-button"
        onClick={onBack}
        type="button"
      >
        ← Zurück
      </button>

      <div className="capture-form-heading">
        <span className="capture-form-icon">
          ↗
        </span>

        <div>
          <h3>
            Link speichern
          </h3>

          <p>
            SaveWise liest die Quelle,
            analysiert den Inhalt und
            ordnet sie deinem Wissen zu.
          </p>
        </div>
      </div>

      <label className="form-field">
        <span>
          URL
        </span>

        <input
          autoFocus
          onChange={(event) => {
            setUrl(
              event.target.value,
            );
          }}
          placeholder="https://..."
          type="url"
          value={url}
        />
      </label>

      <label className="form-field">
        <span>
          Eigene Notizen
          <small>
            optional
          </small>
        </span>

        <textarea
          onChange={(event) => {
            setNotes(
              event.target.value,
            );
          }}
          placeholder="Warum ist diese Quelle für dich relevant?"
          rows={5}
          value={notes}
        />
      </label>

      <div className="capture-form-footer">
        <span className="workspace-hint">
          Workspace:{" "}
          {activeWorkspaceId ===
          "private"
            ? "Privat"
            : "Geschäftlich"}
        </span>

        <button
          className="primary-button"
          disabled={
            !url.trim() ||
            isImporting
          }
          onClick={() => {
            void handleImport();
          }}
          type="button"
        >
          {isImporting
            ? "Analysiere …"
            : "Link analysieren"}
        </button>
      </div>
    </div>
  );
}
