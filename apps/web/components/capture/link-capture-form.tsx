"use client";

import {
  useState,
} from "react";

import {
  GalaxyCandidateSelector,
} from "@/components/capture/galaxy-candidate-selector";

import {
  useDiscoveries,
} from "@/providers/discovery-provider";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

import {
  getDiscoveryLinkGalaxyCandidates,
  type GalaxyCandidatePreview,
} from "@/services/discovery-client";

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

  const {
    importLink,
    isImporting,
  } =
    useDiscoveries();

  const [
    url,
    setUrl,
  ] =
    useState("");

  const [
    knowledgePath,
    setKnowledgePath,
  ] =
    useState("");

  const [
    galaxyCandidates,
    setGalaxyCandidates,
  ] =
    useState<
      GalaxyCandidatePreview[]
    >([]);

  const [
    selectedGalaxy,
    setSelectedGalaxy,
  ] =
    useState<string | null>(
      null,
    );

  const [
    isLoadingCandidates,
    setLoadingCandidates,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  async function handleImport() {
    if (!url.trim()) {
      return;
    }

    setError(null);

    try {
      await importLink({
        url,

        preferredKnowledgePath:
          knowledgePath
            .split(">")
            .map(
              (part) =>
                part.trim(),
            )
            .filter(Boolean)
            .slice(0, 3),
      });

      onComplete();
    } catch (
      importError
    ) {
      setError(
        importError instanceof Error
          ? importError.message
          : "Der Import ist fehlgeschlagen.",
      );
    }
  }

  async function loadCandidates() {
    if (
      !url.trim() ||
      isLoadingCandidates
    ) {
      return;
    }

    setLoadingCandidates(true);
    setError(null);

    try {
      const candidates =
        await getDiscoveryLinkGalaxyCandidates({
          rawUrl: url,
          workspaceId:
            activeWorkspaceId,
        });

      setGalaxyCandidates(
        candidates,
      );
      setSelectedGalaxy(null);
      setKnowledgePath("");
    } catch (
      candidateError
    ) {
      setGalaxyCandidates([]);
      setError(
        candidateError instanceof Error
          ? candidateError.message
          : "Galaxien konnten nicht vorgeschlagen werden.",
      );
    } finally {
      setLoadingCandidates(false);
    }
  }

  function selectGalaxy(
    galaxy: string | null,
  ) {
    setSelectedGalaxy(galaxy);
    setKnowledgePath(
      galaxy ?? "",
    );
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
            analysiert ihren Inhalt und
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
          disabled={
            isImporting
          }
          onChange={(event) => {
            if (selectedGalaxy) {
              setKnowledgePath("");
            }

            setUrl(
              event.target.value,
            );
            setGalaxyCandidates([]);
            setSelectedGalaxy(null);
          }}
          placeholder="https://..."
          type="url"
          value={url}
        />
      </label>

      <GalaxyCandidateSelector
        candidates={
          galaxyCandidates
        }
        disabled={
          !url.trim() ||
          isImporting
        }
        isLoading={
          isLoadingCandidates
        }
        onLoad={() => {
          void loadCandidates();
        }}
        onSelect={
          selectGalaxy
        }
        selectedGalaxy={
          selectedGalaxy
        }
      />

      <label className="form-field">
        <span>
          Gewünschter Wissenspfad
          <small>
            optional
          </small>
        </span>

        <input
          disabled={
            isImporting
          }
          onChange={(event) => {
            setKnowledgePath(
              event.target.value,
            );
            setSelectedGalaxy(null);
          }}
          placeholder="Zum Beispiel: Technologie > KI > Agenten"
          value={knowledgePath}
        />

        <small className="field-help">
          Die KI verwendet diesen Pfad
          als Orientierung und prüft
          dennoch die fachliche Zuordnung.
        </small>
      </label>

      {error ? (
        <div className="capture-error">
          {error}
        </div>
      ) : null}

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
            ? "Quelle wird analysiert …"
            : "Link analysieren"}
        </button>
      </div>
    </div>
  );
}
