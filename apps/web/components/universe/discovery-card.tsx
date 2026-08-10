"use client";

import type {
  Discovery,
} from "@savewise/shared";

import {
  useState,
} from "react";

import {
  useDiscoveries,
} from "@/providers/discovery-provider";

import {
  getDiscoveryTaxonomy,
} from "@/components/universe/discovery-taxonomy";

export function DiscoveryCard({
  discovery,
  onOpen,
}: {
  discovery: Discovery;

  onOpen: (
    discovery: Discovery,
  ) => void;
}) {
  const {
    removeDiscovery,
  } =
    useDiscoveries();

  const [
    isDeleting,
    setDeleting,
  ] =
    useState(false);

  const title =
    discovery.improvedTitle ||
    discovery.title ||
    "Unbenannter Inhalt";

  const taxonomy =
    getDiscoveryTaxonomy(
      discovery,
    );

  const hostname =
    getHostname(
      discovery.url,
    );

  async function handleDelete(
    event:
      React.MouseEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();

    const confirmed =
      window.confirm(
        `"${title}" wirklich löschen?`,
      );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      await removeDiscovery(
        discovery.id,
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article
      className="discovery-card discovery-card-clickable"
      onClick={() => {
        onOpen(
          discovery,
        );
      }}
      onKeyDown={(event) => {
        if (
          event.key ===
            "Enter" ||
          event.key ===
            " "
        ) {
          event.preventDefault();

          onOpen(
            discovery,
          );
        }
      }}
      role="button"
      tabIndex={0}
    >
      {discovery.thumbnailUrl ? (
        <div className="discovery-thumbnail">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            src={
              discovery.thumbnailUrl
            }
          />
        </div>
      ) : (
        <div className="discovery-thumbnail discovery-thumbnail-placeholder">
          <span>
            {captureIcon(
              discovery,
            )}
          </span>
        </div>
      )}

      <div className="discovery-card-body">
        <div className="discovery-card-meta">
          <span className="discovery-source">
            {discovery.attachment
              ?.fileName ||
              hostname ||
              sourceLabel(
                discovery.source,
              )}
          </span>

          {taxonomy.galaxy ? (
            <span className="discovery-category">
              {taxonomy.galaxy}
            </span>
          ) : null}
        </div>

        <h3>
          {title}
        </h3>

        {discovery.summary ? (
          <p className="discovery-summary">
            {discovery.summary}
          </p>
        ) : discovery.description ? (
          <p className="discovery-summary">
            {discovery.description}
          </p>
        ) : null}

        {taxonomy.planet ? (
          <div className="knowledge-path">
            <span>
              {taxonomy.galaxy ||
                "Wissen"}
            </span>

            <b>
              ›
            </b>

            <span>
              {taxonomy.planet}
            </span>

            {taxonomy.stars.length >
            0 ? (
              <>
                <b>
                  ›
                </b>

                <span>
                  {taxonomy.stars.join(
                    ", ",
                  )}
                </span>
              </>
            ) : null}
          </div>
        ) : null}

        {discovery.keywords
          .length > 0 ? (
            <div className="discovery-keywords">
              {discovery.keywords
                .slice(0, 4)
                .map(
                  (keyword) => (
                    <span
                      key={
                        keyword
                      }
                    >
                      {keyword}
                    </span>
                  ),
                )}
            </div>
          ) : null}

        <footer className="discovery-card-footer">
          <span>
            {formatDate(
              discovery.createdAt,
            )}
          </span>

          <div className="discovery-card-actions">
            <span className="discovery-open-label">
              Öffnen
            </span>

            <button
              disabled={
                isDeleting
              }
              onClick={
                handleDelete
              }
              type="button"
            >
              {isDeleting
                ? "Lösche …"
                : "Löschen"}
            </button>
          </div>
        </footer>
      </div>
    </article>
  );
}

function captureIcon(
  discovery: Discovery,
): string {
  if (
    discovery.attachment
      ?.captureType ===
    "pdf"
  ) {
    return "PDF";
  }

  if (
    discovery.attachment
      ?.captureType ===
    "image"
  ) {
    return "IMG";
  }

  return sourceIcon(
    discovery.source,
  );
}

function getHostname(
  url?: string,
): string | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url)
      .hostname
      .replace(
        /^www\./,
        "",
      );
  } catch {
    return null;
  }
}

function sourceLabel(
  source:
    Discovery["source"],
): string {
  return {
    youtube:
      "YouTube",
    instagram:
      "Instagram",
    facebook:
      "Facebook",
    tiktok:
      "TikTok",
    web:
      "Web",
  }[source];
}

function sourceIcon(
  source:
    Discovery["source"],
): string {
  return {
    youtube:
      "▶",
    instagram:
      "◎",
    facebook:
      "f",
    tiktok:
      "♪",
    web:
      "↗",
  }[source];
}

function formatDate(
  value: string,
): string {
  return new Date(
    value,
  ).toLocaleDateString(
    "de-CH",
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
    },
  );
}
