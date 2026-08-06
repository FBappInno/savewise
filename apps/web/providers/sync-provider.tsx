"use client";

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
  getDropboxStatus,
  synchronizeDropbox,
} from "@/services/dropbox-client";

import type {
  DropboxConnectionStatus,
  DropboxSyncResult,
} from "@/types/cloud";

import type {
  SyncStatus,
} from "@/types/desktop";

const INSTALLATION_KEY =
  "savewise.web.installation-id.v1";

type SyncContextValue = {
  status: SyncStatus;

  connection:
    DropboxConnectionStatus | null;

  lastSyncAt: string | null;

  pendingChanges: number;

  error: string | null;

  lastResult:
    DropboxSyncResult | null;

  refreshDropboxStatus:
    () => Promise<void>;

  synchronize:
    () => Promise<DropboxSyncResult>;

  markPendingChange:
    () => void;

  clearPendingChanges:
    () => void;
};

const SyncContext =
  createContext<
    SyncContextValue | null
  >(null);

export function SyncProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    status:
      accountStatus,
  } =
    useAccount();

  const [
    status,
    setStatus,
  ] =
    useState<SyncStatus>(
      "idle",
    );

  const [
    connection,
    setConnection,
  ] =
    useState<
      DropboxConnectionStatus | null
    >(null);

  const [
    lastSyncAt,
    setLastSyncAt,
  ] =
    useState<string | null>(
      null,
    );

  const [
    pendingChanges,
    setPendingChanges,
  ] =
    useState(0);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    lastResult,
    setLastResult,
  ] =
    useState<
      DropboxSyncResult | null
    >(null);

  const refreshDropboxStatus =
    useCallback(
      async (): Promise<void> => {
        if (
          accountStatus !==
          "authenticated"
        ) {
          setConnection(null);
          setLastSyncAt(null);
          setStatus("idle");

          return;
        }

        try {
          const nextConnection =
            await getDropboxStatus();

          setConnection(
            nextConnection,
          );

          setLastSyncAt(
            nextConnection
              .lastSyncAt,
          );

          setError(null);

          setStatus(
            nextConnection.connected
              ? "synced"
              : "idle",
          );
        } catch (
          statusError
        ) {
          const message =
            statusError instanceof Error
              ? statusError.message
              : "Dropbox-Status konnte nicht geladen werden.";

          setError(message);
          setStatus("error");
        }
      },
      [accountStatus],
    );

  useEffect(() => {
    void refreshDropboxStatus();
  }, [refreshDropboxStatus]);

  const synchronize =
    useCallback(
      async (): Promise<DropboxSyncResult> => {
        if (
          !connection?.connected
        ) {
          throw new Error(
            "Dropbox ist nicht verbunden.",
          );
        }

        setStatus("syncing");
        setError(null);

        try {
          const result =
            await synchronizeDropbox(
              getInstallationId(),
            );

          setLastResult(
            result,
          );

          setLastSyncAt(
            result.syncedAt,
          );

          setPendingChanges(0);

          setConnection(
            (current) =>
              current
                ? {
                    ...current,

                    lastSyncAt:
                      result.syncedAt,
                  }
                : current,
          );

          setStatus("synced");

          return result;
        } catch (
          syncError
        ) {
          const message =
            syncError instanceof Error
              ? syncError.message
              : "Synchronisation fehlgeschlagen.";

          setError(message);
          setStatus("error");

          throw syncError;
        }
      },
      [connection],
    );

  function markPendingChange():
  void {
    setPendingChanges(
      (current) =>
        current + 1,
    );

    setStatus("pending");
  }

  function clearPendingChanges():
  void {
    setPendingChanges(0);

    setStatus(
      connection?.connected
        ? "synced"
        : "idle",
    );
  }

  const value =
    useMemo<
      SyncContextValue
    >(
      () => ({
        status,
        connection,
        lastSyncAt,
        pendingChanges,
        error,
        lastResult,
        refreshDropboxStatus,
        synchronize,
        markPendingChange,
        clearPendingChanges,
      }),
      [
        status,
        connection,
        lastSyncAt,
        pendingChanges,
        error,
        lastResult,
        refreshDropboxStatus,
        synchronize,
      ],
    );

  return (
    <SyncContext.Provider
      value={value}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync():
SyncContextValue {
  const context =
    useContext(
      SyncContext,
    );

  if (!context) {
    throw new Error(
      "useSync muss innerhalb des SyncProvider verwendet werden.",
    );
  }

  return context;
}

function getInstallationId():
string {
  const existing =
    window.localStorage.getItem(
      INSTALLATION_KEY,
    );

  if (existing) {
    return existing;
  }

  const created =
    typeof crypto !==
      "undefined" &&
    "randomUUID" in crypto
      ? `web-${crypto.randomUUID()}`
      : [
          "web",
          Date.now(),
          Math.random()
            .toString(36)
            .slice(2, 12),
        ].join("-");

  window.localStorage.setItem(
    INSTALLATION_KEY,
    created,
  );

  return created;
}
