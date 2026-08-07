"use client";

import {
  useState,
} from "react";

import {
  useSync,
} from "@/providers/sync-provider";

export function DropboxSettingsCard() {
  const {
    connection,
    status,
    lastSyncAt,
    error,
    lastResult,
    refreshDropboxStatus,
    synchronize,
  } =
    useSync();

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null,
    );

  const connected =
    Boolean(
      connection?.connected,
    );

  const syncing =
    status ===
    "syncing";

  async function handleSync() {
    setMessage(null);

    try {
      const result =
        await synchronize();

      const imported =
        result.importResult
          ?.addedDiscoveries ??
        0;

      const updated =
        result.importResult
          ?.updatedDiscoveries ??
        0;

      setMessage(
        [
          `${result.uploadedDiscoveries} Inhalte gesichert.`,

          imported > 0
            ? `${imported} neu übernommen.`
            : null,

          updated > 0
            ? `${updated} aktualisiert.`
            : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch {
      // Fehler erscheint bereits aus dem Provider.
    }
  }

  return (
    <article className="cloud-settings-card">
      <div className="cloud-card-main">
        <div className="cloud-icon">
          ☁
        </div>

        <div className="cloud-card-content">
          <div className="card-eyebrow">
            CLOUD-SPEICHER
          </div>

          <div className="cloud-title-row">
            <h2>
              Dropbox
            </h2>

            <span
              className={
                connected
                  ? "connection-badge connection-badge-connected"
                  : "connection-badge"
              }
            >
              {connected
                ? "Verbunden"
                : "Nicht verbunden"}
            </span>
          </div>

          {connected ? (
            <>
              <p className="cloud-account">
                {connection
                  ?.displayName ??
                  "Dropbox"}
              </p>

              {connection
                ?.accountEmail ? (
                <p className="cloud-email">
                  {
                    connection
                      .accountEmail
                  }
                </p>
              ) : null}

              <p className="cloud-description">
                Deine Inhalte werden über
                Railway mit dem privaten
                SaveWise-App-Ordner in
                Dropbox synchronisiert.
              </p>
            </>
          ) : (
            <p className="cloud-description">
              Für dieses SaveWise-Konto
              wurde noch keine
              Dropbox-Verbindung gefunden.
            </p>
          )}
        </div>
      </div>

      <div className="cloud-meta-grid">
        <div>
          <span>
            Letzte Synchronisation
          </span>

          <strong>
            {lastSyncAt
              ? new Date(
                  lastSyncAt,
                ).toLocaleString(
                  "de-CH",
                )
              : "Noch nicht synchronisiert"}
          </strong>
        </div>

        <div>
          <span>
            Speicherort
          </span>

          <strong>
            Apps/SaveWise Cloud
          </strong>
        </div>

        <div>
          <span>
            Synchronisationsdatei
          </span>

          <strong>
            savewise-sync-v1.json
          </strong>
        </div>
      </div>

      {message ? (
        <div className="cloud-message cloud-message-success">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="cloud-message cloud-message-error">
          {error}
        </div>
      ) : null}

      {lastResult &&
      !message ? (
        <div className="cloud-message">
          Zuletzt wurden{" "}
          {
            lastResult
              .uploadedDiscoveries
          }{" "}
          Inhalte gesichert.
        </div>
      ) : null}

      <div className="cloud-card-actions">
        <button
          className="secondary-button"
          disabled={syncing}
          onClick={() => {
            void refreshDropboxStatus();
          }}
          type="button"
        >
          Status aktualisieren
        </button>

        <button
          className="primary-button"
          disabled={
            !connected ||
            syncing
          }
          onClick={() => {
            void handleSync();
          }}
          type="button"
        >
          {syncing
            ? "Synchronisiere …"
            : "Jetzt synchronisieren"}
        </button>
      </div>
    </article>
  );
}
