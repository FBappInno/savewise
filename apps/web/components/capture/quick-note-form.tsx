"use client";

import {
  useState,
} from "react";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

export function QuickNoteForm({
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
    title,
    setTitle,
  ] =
    useState("");

  const [
    content,
    setContent,
  ] =
    useState("");

  const [
    isSaving,
    setSaving,
  ] =
    useState(false);

  async function handleSubmit() {
    if (!content.trim()) {
      return;
    }

    setSaving(true);

    try {
      /*
       * Im nächsten Schritt wird hier
       * die Railway-Capture-API verwendet.
       */
      console.log({
        type: "note",
        title:
          title.trim() ||
          undefined,
        content:
          content.trim(),
        workspaceId:
          activeWorkspaceId,
      });

      onComplete();
    } finally {
      setSaving(false);
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
          ✎
        </span>

        <div>
          <h3>
            Schnellnotiz
          </h3>

          <p>
            Halte einen Gedanken fest.
            SaveWise strukturiert und
            verknüpft ihn anschließend.
          </p>
        </div>
      </div>

      <label className="form-field">
        <span>
          Titel
          <small>
            optional
          </small>
        </span>

        <input
          onChange={(event) => {
            setTitle(
              event.target.value,
            );
          }}
          placeholder="Zum Beispiel: Idee für neues Projekt"
          value={title}
        />
      </label>

      <label className="form-field">
        <span>
          Notiz
        </span>

        <textarea
          autoFocus
          onChange={(event) => {
            setContent(
              event.target.value,
            );
          }}
          placeholder="Was möchtest du festhalten?"
          rows={9}
          value={content}
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
            !content.trim() ||
            isSaving
          }
          onClick={() => {
            void handleSubmit();
          }}
          type="button"
        >
          {isSaving
            ? "Speichern …"
            : "Notiz speichern"}
        </button>
      </div>
    </div>
  );
}
