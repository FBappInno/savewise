"use client";

import type {
  Discovery,
  DiscoveryCategory,
  WorkspaceId,
} from "@savewise/shared";

import {
  useEffect,
  useState,
} from "react";

import {
  useDiscoveries,
} from "@/providers/discovery-provider";

import {
  getDiscoveryTaxonomy,
} from "@/components/universe/discovery-taxonomy";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

import {
  loadDiscoveryAttachment,
} from "@/services/discovery-client";

import {
  exportDiscoveryAsPdf,
} from "@/services/discovery-pdf-export";


const categories:
Array<{
  value: DiscoveryCategory;
  label: string;
}> = [
  {
    value: "technology",
    label: "Technologie",
  },
  {
    value: "finance",
    label: "Finanzen",
  },
  {
    value: "business",
    label: "Business",
  },
  {
    value: "science",
    label: "Wissenschaft",
  },
  {
    value: "health",
    label: "Gesundheit",
  },
  {
    value: "education",
    label: "Bildung",
  },
  {
    value: "productivity",
    label: "Produktivität",
  },
  {
    value: "culture",
    label: "Kultur",
  },
  {
    value: "news",
    label: "Nachrichten",
  },
  {
    value: "lifestyle",
    label: "Lifestyle",
  },
  {
    value: "other",
    label: "Weitere",
  },
];

const languages = [
  {
    value: "de",
    label: "Deutsch",
  },
  {
    value: "en",
    label: "Englisch",
  },
  {
    value: "fr",
    label: "Französisch",
  },
  {
    value: "it",
    label: "Italienisch",
  },
  {
    value: "es",
    label: "Spanisch",
  },
] as const;

export function DiscoveryViewerModal({
  discovery,
  onClose,
}: {
  discovery:
    Discovery | null;

  onClose:
    () => void;
}) {
  const {
    updateDiscovery,
    removeDiscovery,
  } =
    useDiscoveries();

  const {
    activeWorkspaceId,
  } =
    useWorkspace();

  const [
    currentDiscovery,
    setCurrentDiscovery,
  ] =
    useState<Discovery | null>(
      discovery,
    );

  const [
    attachmentUrl,
    setAttachmentUrl,
  ] =
    useState<string | null>(
      null,
    );

  const [
    isLoading,
    setLoading,
  ] =
    useState(false);

  const [
    isEditing,
    setEditing,
  ] =
    useState(false);

  const [
    isActionMenuOpen,
    setActionMenuOpen,
  ] =
    useState(false);

  const [
    isSaving,
    setSaving,
  ] =
    useState(false);

  const [
    isDeleting,
    setDeleting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    summary,
    setSummary,
  ] =
    useState("");

  const [
    workspaceId,
    setWorkspaceId,
  ] =
    useState<WorkspaceId>(
      "private",
    );

  const [
    category,
    setCategory,
  ] =
    useState<DiscoveryCategory>(
      "other",
    );

  const [
    useAiClassification,
    setUseAiClassification,
  ] =
    useState(true);

  const [
    secondaryCategory,
    setSecondaryCategory,
  ] =
    useState("");

  const [
    topic,
    setTopic,
  ] =
    useState("");

  const [
    subtopics,
    setSubtopics,
  ] =
    useState("");

  const [
    language,
    setLanguage,
  ] =
    useState<
      | "de"
      | "en"
      | "fr"
      | "it"
      | "es"
    >("de");

  useEffect(() => {
    setCurrentDiscovery(
      discovery,
    );

    setEditing(false);
    setActionMenuOpen(false);
    setError(null);

    if (!discovery) {
      return;
    }

    setTitle(
      discovery.improvedTitle ||
      discovery.title,
    );

    setSummary(
      discovery.summary ??
      "",
    );

    setWorkspaceId(
      discovery.workspaceId ??
      "private",
    );

    setCategory(
      discovery.classification
        ?.primaryCategory ??
      "other",
    );

    setUseAiClassification(
      discovery.classification
        ?.mode !== "manual",
    );

    setSecondaryCategory(
      discovery.classification
        ?.secondaryCategory ??
      "",
    );

    setTopic(
      discovery.classification
        ?.topic ??
      "",
    );

    setSubtopics(
      (
        discovery.classification
          ?.subtopics ??
        []
      ).join(", "),
    );

    setLanguage(
      normalizeLanguage(
        discovery.language,
      ) ??
      "de",
    );
  }, [discovery]);

  useEffect(() => {
    if (
      !currentDiscovery ||
      !currentDiscovery.attachment
    ) {
      setAttachmentUrl(
        null,
      );

      setLoading(false);

      return;
    }

    const discoveryId =
      currentDiscovery.id;

    let active =
      true;

    let createdUrl:
      string | null =
      null;

    async function loadAttachment():
    Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const result =
          await loadDiscoveryAttachment(
            discoveryId,
          );

        createdUrl =
          result.objectUrl;

        if (active) {
          setAttachmentUrl(
            result.objectUrl,
          );
        } else {
          URL.revokeObjectURL(
            result.objectUrl,
          );
        }
      } catch (
        loadError
      ) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Die Datei konnte nicht geladen werden.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAttachment();

    return () => {
      active =
        false;

      if (createdUrl) {
        URL.revokeObjectURL(
          createdUrl,
        );
      }
    };
  }, [currentDiscovery]);

  useEffect(() => {
    function handleKeyDown(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    }

    if (currentDiscovery) {
      window.addEventListener(
        "keydown",
        handleKeyDown,
      );
    }

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    currentDiscovery,
    onClose,
  ]);

  if (!currentDiscovery) {
    return null;
  }

  const taxonomy =
    getDiscoveryTaxonomy(
      currentDiscovery,
    );

  const originalUrl =
    currentDiscovery.url ??
    null;

  const displayTitle =
    currentDiscovery.improvedTitle ||
    currentDiscovery.title ||
    "Unbenannter Inhalt";

  const isImage =
    currentDiscovery.attachment
      ?.captureType ===
    "image";

  const isPdf =
    currentDiscovery.attachment
      ?.captureType ===
    "pdf";

  async function handleSave():
  Promise<void> {
    const discoveryToUpdate =
      currentDiscovery;

    if (!discoveryToUpdate) {
      return;
    }

    const cleanTitle =
      title.trim();

    const cleanTopic =
      topic.trim();

    const cleanSecondaryCategory =
      secondaryCategory.trim();

    if (
      cleanTitle.length < 3
    ) {
      setError(
        "Der Titel muss mindestens 3 Zeichen enthalten.",
      );

      return;
    }

    if (
      cleanSecondaryCategory.length <
      2
    ) {
      setError(
        "Die Galaxie muss mindestens 2 Zeichen enthalten.",
      );

      return;
    }

    if (
      cleanTopic.length <
      2
    ) {
      setError(
        "Der Planet muss mindestens 2 Zeichen enthalten.",
      );

      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated =
        await updateDiscovery(
          discoveryToUpdate.id,
          {
            title:
              cleanTitle,

            summary:
              summary
                .trim()
                .slice(
                  0,
                  420,
                ),

            workspaceId,

            classification: {
              primaryCategory:
                category,

              mode:
                useAiClassification
                  ? "ai"
                  : "manual",

              secondaryCategory:
                cleanSecondaryCategory,

              topic:
                cleanTopic,

              subtopics:
                subtopics
                  .split(",")
                  .map(
                    (value) =>
                      value.trim(),
                  )
                  .filter(
                    (value) =>
                      value.length >=
                      2,
                  )
                  .slice(
                    0,
                    6,
                  ),
            },

            language,
          },
        );

      setCurrentDiscovery(
        updated,
      );

      setEditing(false);

      /*
       * Wenn eine Discovery in den
       * anderen Workspace verschoben
       * wurde, gehört sie nicht mehr in
       * die aktuelle Ansicht.
       */
      if (
        workspaceId !==
        activeWorkspaceId
      ) {
        onClose();
      }
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Die Änderungen konnten nicht gespeichert werden.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleShare():
  Promise<void> {
    const discoveryToShare =
      currentDiscovery;

    if (!discoveryToShare) {
      return;
    }

    const shareText = [
      displayTitle,
      "",
      discoveryToShare.summary ??
        "",
      "",
      discoveryToShare.url ??
        "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            displayTitle,

          text:
            discoveryToShare.summary ??
            displayTitle,

          url:
            discoveryToShare.url,
        });

        return;
      }

      await navigator.clipboard.writeText(
        shareText,
      );

      window.alert(
        "Discovery wurde in die Zwischenablage kopiert.",
      );
    } catch (
      shareError
    ) {
      if (
        shareError instanceof DOMException &&
        shareError.name ===
          "AbortError"
      ) {
        return;
      }

      window.alert(
        "Teilen ist in diesem Browser nicht verfügbar.",
      );
    }
  }

  async function handleSaveAsPdf():
  Promise<void> {
    const discoveryToExport =
      currentDiscovery;

    if (!discoveryToExport) {
      return;
    }

    try {
      await exportDiscoveryAsPdf(
        discoveryToExport,
      );
    } catch (
      exportError
    ) {
      window.alert(
        exportError instanceof Error
          ? exportError.message
          : "Das PDF konnte nicht erstellt werden.",
      );
    }
  }

  async function handleDelete():
  Promise<void> {
    const discoveryToDelete =
      currentDiscovery;

    if (!discoveryToDelete) {
      return;
    }

    const confirmed =
      window.confirm(
        `„${displayTitle}“ wirklich löschen?`,
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await removeDiscovery(
        discoveryToDelete.id,
      );

      onClose();
    } catch (
      deleteError
    ) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Die Discovery konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function openOriginal():
  void {
    if (attachmentUrl) {
      window.open(
        attachmentUrl,
        "_blank",
        "noopener,noreferrer",
      );

      return;
    }

    if (originalUrl) {
      window.open(
        originalUrl,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  return (
    <div
      className="discovery-viewer-backdrop"
      onMouseDown={
        onClose
      }
    >
      <section
        aria-modal="true"
        className="discovery-viewer"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        role="dialog"
      >
        <header className="discovery-viewer-header">
          <div>
            <div className="card-eyebrow">
              {isPdf
                ? "PDF-DOKUMENT"
                : isImage
                  ? "BILD"
                  : "DISCOVERY"}
            </div>

            <h2>
              {displayTitle}
            </h2>

            <div className="viewer-header-meta">
              <span>
                {(currentDiscovery.workspaceId ??
                  "private") ===
                "business"
                  ? "Geschäftlich"
                  : "Privat"}
              </span>

              <span>
                ·
              </span>

              <span>
                {formatDate(
                  currentDiscovery.createdAt,
                )}
              </span>
            </div>
          </div>

          <div className="viewer-header-actions">
            <div className="discovery-action-menu-wrapper">
              <button
                aria-expanded={
                  isActionMenuOpen
                }
                aria-haspopup="menu"
                aria-label="Discovery-Aktionen"
                className="discovery-more-button"
                onClick={() => {
                  setActionMenuOpen(
                    (current) =>
                      !current,
                  );
                }}
                type="button"
              >
                ···
              </button>

              {isActionMenuOpen ? (
                <div
                  className="discovery-action-menu"
                  role="menu"
                >
                  <button
                    onClick={() => {
                      void handleShare();

                      setActionMenuOpen(
                        false,
                      );
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <span>
                      ↗
                    </span>

                    Teilen
                  </button>

                  <button
                    onClick={() => {
                      void handleSaveAsPdf();

                      setActionMenuOpen(
                        false,
                      );
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <span>
                      PDF
                    </span>

                    Als PDF speichern
                  </button>

                  <button
                    onClick={() => {
                      setEditing(true);
                      setError(null);
                      setActionMenuOpen(
                        false,
                      );
                    }}
                    role="menuitem"
                    type="button"
                  >
                    <span>
                      ✎
                    </span>

                    Anpassen
                  </button>
                </div>
              ) : null}
            </div>

            {isEditing ? (
              <button
                className="secondary-button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                type="button"
              >
                Bearbeitung schließen
              </button>
            ) : null}

            <button
              aria-label="Ansicht schließen"
              className="modal-close-button"
              onClick={
                onClose
              }
              type="button"
            >
              ×
            </button>
          </div>
        </header>

        <div className="discovery-viewer-layout">
          <main className="discovery-viewer-preview">
            {isLoading ? (
              <div className="attachment-loading">
                <span className="file-analysis-spinner" />

                <p>
                  Originaldatei wird aus
                  Dropbox geladen …
                </p>
              </div>
            ) : null}

            {!isLoading &&
            isImage &&
            attachmentUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                alt={
                  displayTitle
                }
                className="discovery-viewer-image"
                src={
                  attachmentUrl
                }
              />
            ) : null}

            {!isLoading &&
            isPdf &&
            attachmentUrl ? (
              <iframe
                className="discovery-viewer-pdf"
                src={
                  attachmentUrl
                }
                title={
                  displayTitle
                }
              />
            ) : null}

            {!currentDiscovery.attachment &&
            currentDiscovery.thumbnailUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                alt=""
                className="discovery-viewer-image"
                src={
                  currentDiscovery
                    .thumbnailUrl
                }
              />
            ) : null}

            {!currentDiscovery.attachment &&
            !currentDiscovery.thumbnailUrl ? (
              <div className="discovery-viewer-placeholder">
                <span>
                  ◎
                </span>

                <p>
                  Für diese Discovery gibt
                  es keine eingebettete
                  Vorschau.
                </p>

                {originalUrl ? (
                  <button
                    className="primary-button"
                    onClick={
                      openOriginal
                    }
                    type="button"
                  >
                    Originalquelle öffnen
                  </button>
                ) : null}
              </div>
            ) : null}
          </main>

          <aside className="discovery-viewer-details">
            {isEditing ? (
              <div className="discovery-edit-form">
                <label className="form-field">
                  <span>
                    Titel
                  </span>

                  <input
                    maxLength={
                      120
                    }
                    onChange={(event) => {
                      setTitle(
                        event.target.value,
                      );
                    }}
                    value={
                      title
                    }
                  />
                </label>

                <label className="form-field">
                  <span>
                    Zusammenfassung
                  </span>

                  <textarea
                    maxLength={
                      420
                    }
                    onChange={(event) => {
                      setSummary(
                        event.target.value,
                      );
                    }}
                    rows={6}
                    value={
                      summary
                    }
                  />

                  <small>
                    {
                      summary.length
                    }
                    /420
                  </small>
                </label>

                <label className="form-field">
                  <span>
                    Workspace
                  </span>

                  <select
                    onChange={(event) => {
                      setWorkspaceId(
                        event.target
                          .value as
                          WorkspaceId,
                      );
                    }}
                    value={
                      workspaceId
                    }
                  >
                    <option value="private">
                      Privat
                    </option>

                    <option value="business">
                      Geschäftlich
                    </option>
                  </select>
                </label>

                <div className="form-field">
                  <span>
                    Klassifizierung
                  </span>

                  <label
                    style={{
                      alignItems: "center",
                      cursor: "pointer",
                      display: "flex",
                      gap: "10px",
                      minHeight: "42px",
                    }}
                  >
                    <input
                      checked={
                        useAiClassification
                      }
                      onChange={(event) => {
                        setUseAiClassification(
                          event.target.checked,
                        );
                      }}
                      style={{
                        height: "18px",
                        width: "18px",
                      }}
                      type="checkbox"
                    />

                    <span>
                      Durch KI kategorisieren
                    </span>
                  </label>

                  <small
                    style={{
                      color: "#7f91a8",
                      display: "block",
                      lineHeight: 1.45,
                      marginTop: "4px",
                    }}
                  >
                    {useAiClassification
                      ? "Galaxie, Planet und Sterne werden von SaveWise bestimmt."
                      : "Der manuelle Wissenspfad wird von SaveWise übernommen und nicht durch die KI ersetzt."}
                  </small>
                </div>

                <label className="form-field">
                  <span>
                    Galaxie
                  </span>

                  <input
                    disabled={
                      useAiClassification
                    }
                    maxLength={
                      60
                    }
                    onChange={(event) => {
                      setSecondaryCategory(
                        event.target.value,
                      );
                    }}
                    value={
                      secondaryCategory
                    }
                  />
                </label>

                <label className="form-field">
                  <span>
                    Planet
                  </span>

                  <input
                    disabled={
                      useAiClassification
                    }
                    maxLength={
                      60
                    }
                    onChange={(event) => {
                      setTopic(
                        event.target.value,
                      );
                    }}
                    value={
                      topic
                    }
                  />
                </label>

                <label className="form-field">
                  <span>
                    Sterne
                  </span>

                  <input
                    disabled={
                      useAiClassification
                    }
                    onChange={(event) => {
                      setSubtopics(
                        event.target.value,
                      );
                    }}
                    placeholder="Mehrere Sterne mit Kommas trennen"
                    value={
                      subtopics
                    }
                  />
                </label>

                <label className="form-field">
                  <span>
                    Sprache
                  </span>

                  <select
                    onChange={(event) => {
                      setLanguage(
                        event.target
                          .value as
                          typeof language,
                      );
                    }}
                    value={
                      language
                    }
                  >
                    {languages.map(
                      (entry) => (
                        <option
                          key={
                            entry.value
                          }
                          value={
                            entry.value
                          }
                        >
                          {
                            entry.label
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                {error ? (
                  <div className="capture-error">
                    {error}
                  </div>
                ) : null}

                <div className="discovery-edit-actions">
                  <button
                    className="primary-button"
                    disabled={
                      isSaving ||
                      isDeleting
                    }
                    onClick={() => {
                      void handleSave();
                    }}
                    type="button"
                  >
                    {isSaving
                      ? "Speichere …"
                      : "Änderungen speichern"}
                  </button>

                  <button
                    className="danger-button"
                    disabled={
                      isSaving ||
                      isDeleting
                    }
                    onClick={() => {
                      void handleDelete();
                    }}
                    type="button"
                  >
                    {isDeleting
                      ? "Lösche …"
                      : "Discovery löschen"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {error ? (
                  <div className="capture-error">
                    {error}
                  </div>
                ) : null}

                {currentDiscovery.summary ? (
                  <section>
                    <div className="card-eyebrow">
                      ZUSAMMENFASSUNG
                    </div>

                    <p>
                      {
                        currentDiscovery
                          .summary
                      }
                    </p>
                  </section>
                ) : null}

                {taxonomy.galaxy ||
                taxonomy.planet ||
                taxonomy.stars.length >
                  0 ? (
                  <section>
                    <div className="card-eyebrow">
                      GALAXIE · PLANET · STERNE
                    </div>

                    <div className="viewer-knowledge-path">
                      <span>
                        {taxonomy.galaxy}
                      </span>

                      <b>
                        ›
                      </b>

                      <span>
                        {taxonomy.planet}
                      </span>
                    </div>

                    {taxonomy.stars.length >
                    0 ? (
                      <div className="discovery-keywords">
                        {taxonomy.stars.map(
                            (
                              subtopic,
                            ) => (
                              <span
                                key={
                                  subtopic
                                }
                              >
                                {
                                  subtopic
                                }
                              </span>
                            ),
                          )}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <section>
                  <div className="card-eyebrow">
                    DETAILS
                  </div>

                  <dl className="viewer-metadata-grid">
                    <div>
                      <dt>
                        Workspace
                      </dt>

                      <dd>
                        {(currentDiscovery.workspaceId ??
                          "private") ===
                        "business"
                          ? "Geschäftlich"
                          : "Privat"}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Sprache
                      </dt>

                      <dd>
                        {
                          currentDiscovery.language ??
                          "–"
                        }
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Erstellt
                      </dt>

                      <dd>
                        {formatDateTime(
                          currentDiscovery.createdAt,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Aktualisiert
                      </dt>

                      <dd>
                        {formatDateTime(
                          currentDiscovery.updatedAt,
                        )}
                      </dd>
                    </div>

                    {currentDiscovery.author ? (
                      <div>
                        <dt>
                          Autor
                        </dt>

                        <dd>
                          {
                            currentDiscovery.author
                          }
                        </dd>
                      </div>
                    ) : null}

                    {typeof currentDiscovery.confidence ===
                    "number" ? (
                      <div>
                        <dt>
                          KI-Confidence
                        </dt>

                        <dd>
                          {Math.round(
                            currentDiscovery.confidence *
                              100,
                          )}
                          %
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </section>

                {currentDiscovery.keywords.length >
                0 ? (
                  <section>
                    <div className="card-eyebrow">
                      SCHLAGWÖRTER
                    </div>

                    <div className="discovery-keywords">
                      {currentDiscovery.keywords.map(
                        (
                          keyword,
                        ) => (
                          <span
                            key={
                              keyword
                            }
                          >
                            {
                              keyword
                            }
                          </span>
                        ),
                      )}
                    </div>
                  </section>
                ) : null}

                {currentDiscovery.attachment ? (
                  <section>
                    <div className="card-eyebrow">
                      DATEI
                    </div>

                    <dl className="attachment-metadata">
                      <div>
                        <dt>
                          Dateiname
                        </dt>

                        <dd>
                          {
                            currentDiscovery
                              .attachment
                              .fileName
                          }
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Größe
                        </dt>

                        <dd>
                          {formatFileSize(
                            currentDiscovery
                              .attachment
                              .sizeBytes,
                          )}
                        </dd>
                      </div>

                      {currentDiscovery
                        .attachment
                        .pageCount ? (
                        <div>
                          <dt>
                            Seiten
                          </dt>

                          <dd>
                            {
                              currentDiscovery
                                .attachment
                                .pageCount
                            }
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </section>
                ) : null}

                {(attachmentUrl ||
                  originalUrl) ? (
                  <button
                    className="primary-button discovery-viewer-open-button"
                    disabled={
                      isLoading
                    }
                    onClick={
                      openOriginal
                    }
                    type="button"
                  >
                    {isPdf
                      ? "PDF öffnen"
                      : isImage
                        ? "Bild öffnen"
                        : "Originalquelle öffnen"}
                  </button>
                ) : null}
              </>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

function normalizeLanguage(
  value:
    string | undefined,
):
  | "de"
  | "en"
  | "fr"
  | "it"
  | "es"
  | undefined {
  return value === "de" ||
    value === "en" ||
    value === "fr" ||
    value === "it" ||
    value === "es"
    ? value
    : undefined;
}

function formatDate(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(
    new Date(value),
  );
}

function formatDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "de-CH",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
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
