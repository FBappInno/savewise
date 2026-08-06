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

const categoryLabels:
Record<string, string> = {
  technology:
    "Technologie",
  finance:
    "Finanzen",
  business:
    "Business",
  science:
    "Wissenschaft",
  health:
    "Gesundheit",
  education:
    "Bildung",
  productivity:
    "Produktivität",
  culture:
    "Kultur",
  news:
    "Nachrichten",
  lifestyle:
    "Lifestyle",
  other:
    "Weitere",
};

export function DiscoveryCard({
  discovery,
}: {
  discovery: Discovery;
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

  const category =
    discovery.classification
      ?.primaryCategory;

  const topic =
    discovery.classification
      ?.topic ??
    discovery.topics?.[0];

  const subtopics =
    discovery.classification
      ?.subtopics ??
    [];

  const hostname =
    getHostname(
      discovery.url,
    );

  async function handleDelete() {
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
    <article className="discovery-card">
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
            {sourceIcon(
              discovery.source,
            )}
          </span>
        </div>
      )}

      <div className="discovery-card-body">
        <div className="discovery-card-meta">
          <span className="discovery-source">
            {hostname ||
              sourceLabel(
                discovery.source,
              )}
          </span>

          {category ? (
            <span className="discovery-category">
              {categoryLabels[
                category
              ] ?? category}
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

        {topic ? (
          <div className="knowledge-path">
            <span>
              {category
                ? categoryLabels[
                    category
                  ] ?? category
                : "Wissen"}
            </span>

            <b>
              ›
            </b>

            <span>
              {topic}
            </span>

            {subtopics[0] ? (
              <>
                <b>
                  ›
                </b>

                <span>
                  {subtopics[0]}
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
            {discovery.url ? (
              <a
                href={
                  discovery.url
                }
                rel="noreferrer"
                target="_blank"
              >
                Quelle öffnen
              </a>
            ) : null}

            <button
              disabled={
                isDeleting
              }
              onClick={() => {
                void handleDelete();
              }}
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
  source: Discovery["source"],
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
  source: Discovery["source"],
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
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}
