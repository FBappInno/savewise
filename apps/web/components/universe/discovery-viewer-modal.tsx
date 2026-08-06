"use client";

import type {
  Discovery,
  DiscoveryCategory,
} from "@savewise/shared";

import {
  useEffect,
  useState,
} from "react";

import {
  useDiscoveries,
} from "@/providers/discovery-provider";

import {
  loadDiscoveryAttachment,
} from "@/services/discovery-client";

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
  } =
    useDiscoveries();

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
    isSaving,
    setSaving,
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
    category,
    setCategory,
  ] =
    useState<DiscoveryCategory>(
      "other",
    );

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

  useEffect(() => {
    setCurrentDiscovery(
      discovery,
    );

    setEditing(false);
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

    setCategory(
      discovery.classification
        ?.primaryCategory ??
      "other",
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
  }, [discovery]);

  useEffect(() => {
    if (
      !currentDiscovery ||
      !currentDiscovery.attachment
    ) {
      setAttachmentUrl(null);
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

  if (!currentDiscovery) {
    return null;
  }

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
    if (
      !title.trim() ||
      !summary.trim() ||
      !topic.trim()
    ) {
      setError(
        "Titel, Zusammenfassung und Thema dürfen nicht leer sein.",
      );

      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated =
        await updateDiscovery(
          currentDiscovery.id,
          {
            title:
              title.trim(),

            summary:
              summary.trim(),

            classification: {
              primaryCategory:
                category,

              secondaryCategory:
                secondaryCategory
                  .trim() ||
                topic.trim(),

              topic:
                topic.trim(),

              subtopics:
                subtopics
                  .split(",")
                  .map(
                    (value) =>
                      value.trim(),
                  )
                  .filter(Boolean)
                  .slice(0, 8),
            },

            language:
              normalizeLanguage(
                currentDiscovery
                  .language,
              ),
          },
        );

      setCurrentDiscovery(
        updated,
      );

      setEditing(false);
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
          </div>

          <div className="viewer-header-actions">
            <button
              className="secondary-button"
              onClick={() => {
                setEditing(
                  (current) =>
                    !current,
                );
              }}
              type="button"
            >
              {isEditing
                ? "Bearbeitung schließen"
                : "Bearbeiten"}
            </button>

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

            {error &&
            !isEditing ? (
              <div className="capture-error">
                {error}
              </div>
            ) : null}

            {!isLoading &&
            !error &&
            isImage &&
            attachmentUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                alt={displayTitle}
                className="discovery-viewer-image"
                src={
                  attachmentUrl
                }
              />
            ) : null}

            {!isLoading &&
            !error &&
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
                    onChange={(event) => {
                      setTitle(
                        event.target.value,
                      );
                    }}
                    value={title}
                  />
                </label>

                <label className="form-field">
                  <span>
                    Zusammenfassung
                  </span>

                  <textarea
                    onChange={(event) => {
                      setSummary(
                        event.target.value,
                      );
                    }}
                    rows={7}
                    value={summary}
                  />
                </label>

                <label className="form-field">
                  <span>
                    Domäne
                  </span>

                  <select
                    onChange={(event) => {
                      setCategory(
                        event.target.value as
                          DiscoveryCategory,
                      );
                    }}
                    value={
                      category
                    }
                  >
                    {categories.map(
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

                <label className="form-field">
                  <span>
                    Unterdomäne
                  </span>

                  <input
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
                    Thema
                  </span>

                  <input
                    onChange={(event) => {
                      setTopic(
                        event.target.value,
                      );
                    }}
                    value={topic}
                  />
                </label>

                <label className="form-field">
                  <span>
                    Unterthemen
                  </span>

                  <input
                    onChange={(event) => {
                      setSubtopics(
                        event.target.value,
                      );
                    }}
                    placeholder="Mit Komma trennen"
                    value={
                      subtopics
                    }
                  />
                </label>

                {error ? (
                  <div className="capture-error">
                    {error}
                  </div>
                ) : null}

                <button
                  className="primary-button"
                  disabled={
                    isSaving
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
              </div>
            ) : (
              <>
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

                {currentDiscovery.classification ? (
                  <section>
                    <div className="card-eyebrow">
                      WISSENSPFAD
                    </div>

                    <div className="viewer-knowledge-path">
                      <span>
                        {
                          currentDiscovery
                            .classification
                            .primaryCategory
                        }
                      </span>

                      <b>
                        ›
                      </b>

                      <span>
                        {
                          currentDiscovery
                            .classification
                            .secondaryCategory
                        }
                      </span>

                      <b>
                        ›
                      </b>

                      <span>
                        {
                          currentDiscovery
                            .classification
                            .topic
                        }
                      </span>
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
                      ? "PDF in neuem Tab öffnen"
                      : isImage
                        ? "Bild in neuem Tab öffnen"
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
