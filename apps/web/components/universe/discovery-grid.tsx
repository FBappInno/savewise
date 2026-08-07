"use client";

import type {
  Discovery,
} from "@savewise/shared";

import {
  useMemo,
} from "react";

import {
  DiscoveryCard,
} from "@/components/universe/discovery-card";

import {
  useDiscoveries,
} from "@/providers/discovery-provider";

import {
  useGlobalSearch,
} from "@/providers/search-provider";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

export function DiscoveryGrid({
  onOpenDiscovery,
}: {
  onOpenDiscovery:
    (discovery: Discovery) => void;
}) {
  const {
    workspaceDiscoveries,
    isLoading,
    error,
    refreshDiscoveries,
  } =
    useDiscoveries();

  const {
    activeWorkspaceId,
  } =
    useWorkspace();

  const {
    searchQuery,
    clearSearch,
  } =
    useGlobalSearch();

  const sortedDiscoveries =
    useMemo(
      () =>
        [...workspaceDiscoveries]
          .sort(
            (
              left,
              right,
            ) =>
              new Date(
                right.createdAt,
              ).getTime() -
              new Date(
                left.createdAt,
              ).getTime(),
          ),
      [workspaceDiscoveries],
    );

  const filtered =
    useMemo(
      () => {
        const normalized =
          searchQuery
            .trim()
            .toLocaleLowerCase(
              "de-CH",
            );

        if (!normalized) {
          return sortedDiscoveries;
        }

        return sortedDiscoveries.filter(
          (discovery) => {
            const content = [
              discovery.title,
              discovery.improvedTitle,
              discovery.summary,
              discovery.description,
              discovery.author,
              discovery.classification
                ?.primaryCategory,
              discovery.classification
                ?.secondaryCategory,
              discovery.classification
                ?.topic,
              ...(
                discovery.classification
                  ?.subtopics ??
                []
              ),
              ...discovery.keywords,
              ...discovery.topics,
            ]
              .filter(Boolean)
              .join(" ")
              .toLocaleLowerCase(
                "de-CH",
              );

            return content.includes(
              normalized,
            );
          },
        );
      },
      [
        searchQuery,
        sortedDiscoveries,
      ],
    );

  return (
    <section className="universe-discoveries">
      <div className="discovery-section-heading">
        <div>
          <div className="card-eyebrow">
            CHRONOLOGIE
          </div>

          <h2>
            Discoveries
          </h2>

          <p>
            Neueste Inhalte zuerst ·{" "}
            {
              workspaceDiscoveries
                .length
            }{" "}
            {workspaceDiscoveries.length ===
            1
              ? "Eintrag"
              : "Einträge"}{" "}
            im Workspace{" "}
            {activeWorkspaceId ===
            "private"
              ? "Privat"
              : "Geschäftlich"}
          </p>
        </div>

        <button
          aria-label="Discoveries aktualisieren"
          className="icon-button"
          disabled={
            isLoading
          }
          onClick={() => {
            void refreshDiscoveries();
          }}
          title="Aktualisieren"
          type="button"
        >
          ↻
        </button>
      </div>

      {searchQuery ? (
        <div className="active-search-message">
          <span>
            Ergebnisse für{" "}
            <strong>
              „{searchQuery}“
            </strong>
          </span>

          <button
            onClick={
              clearSearch
            }
            type="button"
          >
            Suche löschen
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="universe-error">
          <div>
            <strong>
              Inhalte konnten nicht geladen werden
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            onClick={() => {
              void refreshDiscoveries();
            }}
            type="button"
          >
            Erneut versuchen
          </button>
        </div>
      ) : null}

      {isLoading &&
      workspaceDiscoveries.length ===
        0 ? (
        <div className="discovery-loading-grid">
          {Array.from({
            length:
              6,
          }).map(
            (_, index) => (
              <div
                className="discovery-skeleton"
                key={index}
              />
            ),
          )}
        </div>
      ) : null}

      {!isLoading &&
      !error &&
      workspaceDiscoveries.length ===
        0 ? (
        <div className="universe-empty">
          <div className="empty-icon">
            ◎
          </div>

          <h3>
            Dieser Workspace ist noch leer
          </h3>

          <p>
            Verwende „Neues Wissen
            erfassen“ links in der Sidebar.
          </p>
        </div>
      ) : null}

      {workspaceDiscoveries.length >
        0 &&
      filtered.length ===
        0 ? (
        <div className="universe-empty universe-empty-compact">
          <h3>
            Keine passenden Inhalte
          </h3>

          <p>
            Ändere deinen Suchbegriff oder
            lösche die globale Suche.
          </p>

          <button
            className="secondary-button"
            onClick={
              clearSearch
            }
            type="button"
          >
            Suche löschen
          </button>
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="discovery-grid">
          {filtered.map(
            (discovery) => (
              <DiscoveryCard
                discovery={
                  discovery
                }
                key={
                  discovery.id
                }
                onOpen={
                  onOpenDiscovery
                }
              />
            ),
          )}
        </div>
      ) : null}
    </section>
  );
}
