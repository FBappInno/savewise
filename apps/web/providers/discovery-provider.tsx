"use client";

import type {
  Discovery,
} from "@savewise/shared";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAccount,
} from "@/providers/account-provider";

import {
  useSync,
} from "@/providers/sync-provider";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

import {
  deleteDiscovery as deleteDiscoveryRequest,
  getDiscoveries,
  importDiscoveryFile,
  importDiscoveryLink,
} from "@/services/discovery-client";

type DiscoveryContextValue = {
  discoveries: Discovery[];

  workspaceDiscoveries:
    Discovery[];

  isLoading: boolean;

  isImporting: boolean;

  error: string | null;

  refreshDiscoveries:
    () => Promise<void>;

  importLink: (
    input: {
      url: string;

      preferredKnowledgePath?:
        string[];
    },
  ) => Promise<Discovery>;

  importFile: (
    input: {
      file: File;

      captureType:
        | "pdf"
        | "image";

      preferredKnowledgePath?:
        string[];
    },
  ) => Promise<Discovery>;

  removeDiscovery: (
    discoveryId: string,
  ) => Promise<void>;

  clearError: () => void;
};

const DiscoveryContext =
  createContext<
    DiscoveryContextValue | null
  >(null);

export function DiscoveryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    status:
      accountStatus,
  } =
    useAccount();

  const {
    activeWorkspaceId,
  } =
    useWorkspace();

  const {
    markPendingChange,
  } =
    useSync();

  const [
    discoveries,
    setDiscoveries,
  ] =
    useState<Discovery[]>(
      [],
    );

  const [
    isLoading,
    setLoading,
  ] =
    useState(false);

  const [
    isImporting,
    setImporting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const refreshDiscoveries =
    useCallback(
      async (): Promise<void> => {
        if (
          accountStatus !==
          "authenticated"
        ) {
          setDiscoveries([]);

          return;
        }

        setLoading(true);
        setError(null);

        try {
          const loaded =
            await getDiscoveries();

          setDiscoveries(
            [...loaded].sort(
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
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Die Inhalte konnten nicht geladen werden.",
          );
        } finally {
          setLoading(false);
        }
      },
      [accountStatus],
    );

  useEffect(() => {
    void refreshDiscoveries();
  }, [refreshDiscoveries]);

  const importLink =
    useCallback(
      async (
        input: {
          url: string;

          preferredKnowledgePath?:
            string[];
        },
      ): Promise<Discovery> => {
        setImporting(true);
        setError(null);

        try {
          const result =
            await importDiscoveryLink({
              rawUrl:
                input.url,

              workspaceId:
                activeWorkspaceId,

              preferredLanguage:
                "de",

              preferredKnowledgePath:
                input
                  .preferredKnowledgePath,
            });

          setDiscoveries(
            (current) => [
              result.discovery,

              ...current.filter(
                (discovery) =>
                  discovery.id !==
                  result.discovery.id,
              ),
            ],
          );

          markPendingChange();

          return result.discovery;
        } catch (
          importError
        ) {
          const message =
            importError instanceof Error
              ? importError.message
              : "Der Import ist fehlgeschlagen.";

          setError(message);

          throw importError;
        } finally {
          setImporting(false);
        }
      },
      [
        activeWorkspaceId,
        markPendingChange,
      ],
    );

  const importFile =
    useCallback(
      async (
        input: {
          file: File;

          captureType:
            | "pdf"
            | "image";

          preferredKnowledgePath?:
            string[];
        },
      ): Promise<Discovery> => {
        setImporting(true);
        setError(null);

        try {
          const result =
            await importDiscoveryFile({
              file:
                input.file,

              captureType:
                input.captureType,

              workspaceId:
                activeWorkspaceId,

              preferredLanguage:
                "de",

              preferredKnowledgePath:
                input
                  .preferredKnowledgePath,
            });

          setDiscoveries(
            (current) => [
              result.discovery,

              ...current.filter(
                (discovery) =>
                  discovery.id !==
                  result.discovery.id,
              ),
            ],
          );

          markPendingChange();

          return result.discovery;
        } catch (
          importError
        ) {
          const message =
            importError instanceof Error
              ? importError.message
              : "Der Dateiimport ist fehlgeschlagen.";

          setError(message);

          throw importError;
        } finally {
          setImporting(false);
        }
      },
      [
        activeWorkspaceId,
        markPendingChange,
      ],
    );

  const removeDiscovery =
    useCallback(
      async (
        discoveryId: string,
      ): Promise<void> => {
        setError(null);

        try {
          await deleteDiscoveryRequest(
            discoveryId,
          );

          setDiscoveries(
            (current) =>
              current.filter(
                (discovery) =>
                  discovery.id !==
                  discoveryId,
              ),
          );

          markPendingChange();
        } catch (
          deleteError
        ) {
          const message =
            deleteError instanceof Error
              ? deleteError.message
              : "Der Inhalt konnte nicht gelöscht werden.";

          setError(message);

          throw deleteError;
        }
      },
      [markPendingChange],
    );

  const workspaceDiscoveries =
    useMemo(
      () =>
        discoveries.filter(
          (discovery) =>
            (
              discovery.workspaceId ??
              "private"
            ) ===
            activeWorkspaceId,
        ),
      [
        activeWorkspaceId,
        discoveries,
      ],
    );

  const value =
    useMemo<
      DiscoveryContextValue
    >(
      () => ({
        discoveries,
        workspaceDiscoveries,
        isLoading,
        isImporting,
        error,
        refreshDiscoveries,
        importLink,
        importFile,
        removeDiscovery,

        clearError() {
          setError(null);
        },
      }),
      [
        discoveries,
        workspaceDiscoveries,
        isLoading,
        isImporting,
        error,
        refreshDiscoveries,
        importLink,
        importFile,
        removeDiscovery,
      ],
    );

  return (
    <DiscoveryContext.Provider
      value={value}
    >
      {children}
    </DiscoveryContext.Provider>
  );
}

export function useDiscoveries():
DiscoveryContextValue {
  const context =
    useContext(
      DiscoveryContext,
    );

  if (!context) {
    throw new Error(
      "useDiscoveries muss innerhalb des DiscoveryProvider verwendet werden.",
    );
  }

  return context;
}
