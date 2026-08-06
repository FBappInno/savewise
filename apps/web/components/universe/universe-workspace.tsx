"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import {
  DiscoveryGrid,
} from "@/components/universe/discovery-grid";

import {
  KnowledgeGalaxy,
} from "@/components/universe/knowledge-galaxy";

import {
  useGlobalSearch,
} from "@/providers/search-provider";

type UniverseView =
  | "galaxy"
  | "discoveries";

export function UniverseWorkspace() {
  const searchParams =
    useSearchParams();

  const {
    searchQuery,
  } =
    useGlobalSearch();

  const requestedView =
    searchParams.get(
      "view",
    );

  const [
    activeView,
    setActiveView,
  ] =
    useState<UniverseView>(
      requestedView ===
        "discoveries"
        ? "discoveries"
        : "galaxy",
    );

  useEffect(() => {
    if (
      requestedView ===
      "discoveries"
    ) {
      setActiveView(
        "discoveries",
      );
    }
  }, [requestedView]);

  useEffect(() => {
    if (
      searchQuery.trim()
    ) {
      setActiveView(
        "discoveries",
      );
    }
  }, [searchQuery]);

  return (
    <section className="universe-workspace">
      <div className="universe-view-tabs">
        <button
          className={
            activeView ===
            "galaxy"
              ? "universe-view-tab universe-view-tab-active"
              : "universe-view-tab"
          }
          onClick={() => {
            setActiveView(
              "galaxy",
            );
          }}
          type="button"
        >
          <span>
            ✦
          </span>

          Galaxie
        </button>

        <button
          className={
            activeView ===
            "discoveries"
              ? "universe-view-tab universe-view-tab-active"
              : "universe-view-tab"
          }
          onClick={() => {
            setActiveView(
              "discoveries",
            );
          }}
          type="button"
        >
          <span>
            ▦
          </span>

          Discoveries
        </button>
      </div>

      {activeView ===
      "galaxy" ? (
        <KnowledgeGalaxy />
      ) : (
        <DiscoveryGrid />
      )}
    </section>
  );
}
