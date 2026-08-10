"use client";

import {
  type ChangeEvent,
  useRef,
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
  getDiscoveryFileGalaxyCandidates,
  type GalaxyCandidatePreview,
} from "@/services/discovery-client";

import {
  loadWebSettings,
  resolvePreferredLanguage,
} from "@/services/web-settings";

export function FileCaptureForm({
  captureType,
  onBack,
  onComplete,
}: {
  captureType:
    | "pdf"
    | "image";

  onBack: () => void;

  onComplete: () => void;
}) {
  const inputRef =
    useRef<HTMLInputElement>(
      null,
    );

  const {
    activeWorkspaceId,
  } =
    useWorkspace();

  const {
    importFile,
    isImporting,
  } =
    useDiscoveries();

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null,
    );

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

  const isPdf =
    captureType ===
    "pdf";

  const accept =
    isPdf
      ? "application/pdf"
      : "image/jpeg,image/png,image/webp";

  function handleFile(
    selected:
      File | null,
  ) {
    setError(null);

    if (selectedGalaxy) {
      setKnowledgePath("");
    }

    setGalaxyCandidates([]);
    setSelectedGalaxy(null);

    if (!selected) {
      setFile(null);

      return;
    }

    const valid =
      isPdf
        ? selected.type ===
          "application/pdf"
        : [
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(
            selected.type,
          );

    if (!valid) {
      setFile(null);

      setError(
        isPdf
          ? "Bitte wähle eine PDF-Datei."
          : "Bitte wähle ein JPEG-, PNG- oder WebP-Bild.",
      );

      return;
    }

    const maximumSize =
      isPdf
        ? 25 *
          1024 *
          1024
        : 15 *
          1024 *
          1024;

    if (
      selected.size >
      maximumSize
    ) {
      setFile(null);

      setError(
        `Die Datei darf maximal ${
          maximumSize /
          1024 /
          1024
        } MB groß sein.`,
      );

      return;
    }

    setFile(selected);
  }

  async function loadCandidates() {
    if (
      !file ||
      isLoadingCandidates
    ) {
      return;
    }

    setLoadingCandidates(true);
    setError(null);

    try {
      const settings =
        loadWebSettings();

      const candidates =
        await getDiscoveryFileGalaxyCandidates({
          file,
          captureType,
          workspaceId:
            activeWorkspaceId,
          preferredLanguage:
            resolvePreferredLanguage(
              settings,
            ),
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
          : "Die passenden Galaxien konnten nicht ermittelt werden.",
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

  async function handleSubmit() {
    if (!file) {
      return;
    }

    setError(null);

    try {
      await importFile({
        file,

        captureType,

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
      uploadError
    ) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Der Dateiimport ist fehlgeschlagen.",
      );
    }
  }

  function handleInput(
    event:
      ChangeEvent<HTMLInputElement>,
  ) {
    handleFile(
      event.target.files?.[0] ??
        null,
    );
  }

  return (
    <div className="capture-form">
      <button
        className="capture-back-button"
        disabled={
          isImporting
        }
        onClick={onBack}
        type="button"
      >
        ← Zurück
      </button>

      <div className="capture-form-heading">
        <span className="capture-form-icon">
          {isPdf
            ? "▤"
            : "▧"}
        </span>

        <div>
          <h3>
            {isPdf
              ? "PDF importieren"
              : "Bild importieren"}
          </h3>

          <p>
            {isPdf
              ? "SaveWise extrahiert den Text, analysiert das Dokument und ordnet es deinem Wissen zu."
              : "SaveWise erkennt Bildinhalt, sichtbaren Text, Diagramme und fachliche Zusammenhänge."}
          </p>
        </div>
      </div>

      <input
        accept={accept}
        hidden
        onChange={
          handleInput
        }
        ref={inputRef}
        type="file"
      />

      <button
        className={
          file
            ? "file-drop-zone file-drop-zone-selected"
            : "file-drop-zone"
        }
        disabled={
          isImporting
        }
        onClick={() => {
          inputRef.current
            ?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();

          handleFile(
            event.dataTransfer
              .files?.[0] ??
              null,
          );
        }}
        type="button"
      >
        <span className="file-drop-icon">
          {isPdf
            ? "PDF"
            : "IMG"}
        </span>

        {file ? (
          <span className="file-selection">
            <strong>
              {file.name}
            </strong>

            <small>
              {formatFileSize(
                file.size,
              )}
            </small>
          </span>
        ) : (
          <span className="file-selection">
            <strong>
              Datei auswählen oder hierher ziehen
            </strong>

            <small>
              {isPdf
                ? "PDF · maximal 25 MB"
                : "JPEG, PNG oder WebP · maximal 15 MB"}
            </small>
          </span>
        )}
      </button>

      <GalaxyCandidateSelector
        candidates={
          galaxyCandidates
        }
        disabled={
          !file ||
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
          placeholder="Zum Beispiel: Maschinenbau > Werkstoffe > Leichtbau"
          value={knowledgePath}
        />

        <small className="field-help">
          Die KI verwendet diesen Pfad als
          Orientierung und prüft dennoch
          die fachliche Zuordnung.
        </small>
      </label>

      {error ? (
        <div className="capture-error">
          {error}
        </div>
      ) : null}

      {isImporting ? (
        <div className="file-analysis-status">
          <span className="file-analysis-spinner" />

          <div>
            <strong>
              {isPdf
                ? "Dokument wird analysiert …"
                : "Bild wird analysiert …"}
            </strong>

            <p>
              Upload, KI-Analyse,
              Wissenszuordnung und
              Dropbox-Sicherung können
              einige Sekunden dauern.
            </p>
          </div>
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
            !file ||
            isImporting
          }
          onClick={() => {
            void handleSubmit();
          }}
          type="button"
        >
          {isImporting
            ? "Analysiere …"
            : isPdf
              ? "PDF analysieren"
              : "Bild analysieren"}
        </button>
      </div>
    </div>
  );
}

function formatFileSize(
  bytes: number,
): string {
  if (
    bytes <
    1024 *
      1024
  ) {
    return `${Math.max(
      1,
      Math.round(
        bytes / 1024,
      ),
    )} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(1)} MB`;
}
