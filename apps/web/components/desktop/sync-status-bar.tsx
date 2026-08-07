"use client";

import {
  useSync,
} from "@/providers/sync-provider";

const labels = {
  idle:
    "Bereit",

  syncing:
    "Synchronisiere …",

  synced:
    "Dropbox synchronisiert",

  pending:
    "Änderungen ausstehend",

  offline:
    "Offline",

  error:
    "Synchronisationsfehler",
} as const;

export function SyncStatusBar() {
  const {
    status,
    connection,
    lastSyncAt,
    pendingChanges,
    synchronize,
  } =
    useSync();

  const canSynchronize =
    Boolean(
      connection?.connected,
    ) &&
    status !==
      "syncing";

  return (
    <footer className="sync-status-bar">
      <div className="sync-status-left">
        <span
          className={
            `sync-dot sync-dot-${status}`
          }
        />

        <span className="sync-status-label">
          {connection?.connected
            ? labels[status]
            : "Dropbox nicht verbunden"}
        </span>

        {lastSyncAt ? (
          <span className="sync-time">
            {new Date(
              lastSyncAt,
            ).toLocaleString(
              "de-CH",
            )}
          </span>
        ) : null}
      </div>

      <div className="sync-status-right">
        <span>
          {pendingChanges > 0
            ? `${pendingChanges} Änderungen`
            : "Keine offenen Änderungen"}
        </span>

        <button
          className="status-sync-button"
          disabled={
            !canSynchronize
          }
          onClick={() => {
            void synchronize();
          }}
          type="button"
        >
          {status ===
          "syncing"
            ? "Läuft …"
            : "Synchronisieren"}
        </button>
      </div>
    </footer>
  );
}
