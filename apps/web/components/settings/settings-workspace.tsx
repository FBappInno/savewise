"use client";

import {
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  DropboxSettingsCard,
} from "@/components/settings/dropbox-settings-card";

import {
  AccountSettingsModal,
  type AccountSettingsAction,
} from "@/components/settings/account-settings-modal";


import {
  useWebSettings,
} from "@/hooks/use-web-settings";

import {
  useAccount,
} from "@/providers/account-provider";

import {
  useDiscoveries,
} from "@/providers/discovery-provider";

import {
  useSync,
} from "@/providers/sync-provider";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

import {
  revokeOtherSessions,
} from "@/services/account-settings-client";

import {
  rebuildKnowledgeUniverse,
} from "@/services/knowledge-settings-client";

import type {
  WebDateFormat,
  WebDisplayLanguage,
  WebInputLanguage,
  WebTimeFormat,
} from "@/services/web-settings";

const OPTIMIZATION_STAGES = [
  "Discoveries analysieren",
  "Domänen überprüfen",
  "Topics neu gruppieren",
  "Unterthemen strukturieren",
  "Verbindungen berechnen",
] as const;

export function SettingsWorkspace() {
  const router =
    useRouter();

  const {
    account,
    logout,
    refreshSession,
  } =
    useAccount();

  const {
    activeWorkspaceId,
    setActiveWorkspaceId,
  } =
    useWorkspace();

  const {
    refreshDiscoveries,
  } =
    useDiscoveries();

  const {
    connection,
    status:
      syncStatus,
    lastSyncAt,
    synchronize,
  } =
    useSync();

  const {
    settings,
    isLoaded,
    updateSettings,
  } =
    useWebSettings();

  const [
    accountAction,
    setAccountAction,
  ] =
    useState<
      AccountSettingsAction | null
    >(null);

  const [
    isOptimizing,
    setOptimizing,
  ] =
    useState(false);

  const [
    optimizationStage,
    setOptimizationStage,
  ] =
    useState(0);

  const [
    optimizationResult,
    setOptimizationResult,
  ] =
    useState<string | null>(
      null,
    );

  const [
    optimizationError,
    setOptimizationError,
  ] =
    useState<string | null>(
      null,
    );

  async function handleWorkspaceChange(
    workspaceId:
      "private"
      | "business",
  ): Promise<void> {
    setActiveWorkspaceId(
      workspaceId,
    );

    await refreshDiscoveries();
  }

  async function handleOptimizeUniverse():
  Promise<void> {
    if (
      !settings.ai
        .knowledgeGraph ||
      isOptimizing
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Das Wissensuniversum jetzt neu analysieren und strukturieren?",
      );

    if (!confirmed) {
      return;
    }

    setOptimizing(true);
    setOptimizationStage(0);
    setOptimizationResult(null);
    setOptimizationError(null);

    const timer =
      window.setInterval(
        () => {
          setOptimizationStage(
            (current) =>
              Math.min(
                current + 1,
                OPTIMIZATION_STAGES.length -
                  1,
              ),
          );
        },
        4500,
      );

    try {
      const response =
        await rebuildKnowledgeUniverse();

      const nodes =
        response.library.graph
          ?.nodes ??
        [];

      const domains =
        nodes.filter(
          (node) =>
            node.kind ===
            "domain",
        ).length;

      const topics =
        nodes.filter(
          (node) =>
            node.kind ===
            "topic",
        ).length;

      setOptimizationResult(
        [
          `${response.library.discoveries.length} Discoveries analysiert`,
          `${domains} Domänen`,
          `${topics} Topics`,
        ].join(" · "),
      );

      await refreshDiscoveries();
    } catch (
      error
    ) {
      setOptimizationError(
        error instanceof Error
          ? error.message
          : "Optimierung fehlgeschlagen.",
      );
    } finally {
      window.clearInterval(
        timer,
      );

      setOptimizing(false);
      setOptimizationStage(0);
    }
  }

  if (!isLoaded) {
    return (
      <div className="settings-loading">
        Einstellungen werden geladen …
      </div>
    );
  }

  const enabledAiSystems =
    [
      settings.ai
        .contentAnalysis,

      settings.ai
        .knowledgeGraph,

      settings.ai
        .autonomousResearch,
    ].filter(Boolean).length;

  const storageLabel =
    connection?.connected
      ? "CONNECTED"
      : "READY";

  return (
    <div className="settings-workspace">
      <header className="settings-hero">
        <div>
          <div className="card-eyebrow">
            SYSTEMKONFIGURATION
          </div>

          <h1>
            Einstellungen
          </h1>

          <p>
            Konto, KI, Datenschutz,
            Arbeitsbereiche und
            Synchronisation von SaveWise.
          </p>
        </div>

        <div className="settings-system-overview">
          <SystemMetric
            label="AI Core"
            value={`${enabledAiSystems}/3`}
          />

          <SystemMetric
            label="Storage"
            value={
              storageLabel
            }
          />

          <SystemMetric
            label="Privacy"
            value={
              settings.privacy
                .usageAnalytics
                ? "ACTIVE"
                : "PRIVATE"
            }
          />
        </div>
      </header>

      <div className="settings-sections">
        <SettingsSection
          description="Profil, Sicherheit und Verwaltung deines SaveWise-Kontos."
          eyebrow="IDENTITÄT"
          icon="◎"
          title="Konto"
        >
          <div className="settings-account-card">
            <div className="settings-account-avatar">
              {(
                account?.username ??
                account?.email ??
                "S"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="settings-account-info">
              <strong>
                {account?.username ??
                  "SaveWise Benutzer"}
              </strong>

              <span>
                {account?.email ??
                  "Keine E-Mail"}
              </span>
            </div>

            <div className="settings-status-badge settings-status-success">
              ANGEMELDET
            </div>
          </div>

          <div className="settings-account-subsection">
            <div className="settings-account-subsection-heading">
              <div>
                <div className="card-eyebrow">
                  PROFIL
                </div>

                <strong>
                  Persönliche Kontodaten
                </strong>
              </div>
            </div>

            <AccountActionRow
              label="Benutzername"
              value={
                account?.username ??
                "–"
              }
              actionLabel="Ändern"
              onClick={() => {
                setAccountAction(
                  "username",
                );
              }}
            />

            <AccountActionRow
              label="E-Mail-Adresse"
              value={
                account?.email ??
                "–"
              }
              secondaryValue="✓ Verifiziert"
              actionLabel="Ändern"
              onClick={() => {
                setAccountAction(
                  "email",
                );
              }}
            />
          </div>

          <div className="settings-account-subsection">
            <div className="settings-account-subsection-heading">
              <div>
                <div className="card-eyebrow">
                  SICHERHEIT
                </div>

                <strong>
                  Anmeldung & Geräte
                </strong>
              </div>
            </div>

            <AccountActionRow
              label="Passwort"
              value="••••••••••••"
              actionLabel="Ändern"
              onClick={() => {
                setAccountAction(
                  "password",
                );
              }}
            />

            <AccountActionRow
              label="Aktive Sitzungen"
              value="Web & mobile Geräte"
              actionLabel="Verwalten"
              onClick={() => {
                window.alert(
                  "Die Geräteverwaltung wird vorbereitet. Später werden hier aktive Browser- und App-Sitzungen einzeln angezeigt.",
                );
              }}
            />

            <button
              className="settings-account-link-button"
              onClick={() => {
                void revokeOtherSessions()
                  .then(
                    (revoked) => {
                      window.alert(
                        revoked > 0
                          ? `${revoked} andere Sitzung(en) wurden abgemeldet.`
                          : "Es waren keine weiteren aktiven Sitzungen vorhanden.",
                      );
                    },
                  )
                  .catch(
                    (error) => {
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : "Sitzungen konnten nicht beendet werden.",
                      );
                    },
                  );
              }}
              type="button"
            >
              Alle anderen Geräte abmelden
            </button>
          </div>

          <div className="settings-account-subsection">
            <div className="settings-account-subsection-heading">
              <div>
                <div className="card-eyebrow">
                  DATEN & KONTO
                </div>

                <strong>
                  Export und Kontoverwaltung
                </strong>
              </div>
            </div>

            <AccountActionRow
              label="Meine Daten exportieren"
              value="Discoveries, Wissensstruktur und Accountdaten"
              actionLabel="Export"
              onClick={() => {
                window.alert(
                  "Der vollständige Datenexport wird vorbereitet.",
                );
              }}
            />

            <AccountActionRow
              danger
              label="Konto endgültig löschen"
              value="Account und zugehörige SaveWise-Daten entfernen"
              actionLabel="Löschen"
              onClick={() => {
                window.alert(
                  "Die endgültige Kontolöschung wird erst aktiviert, sobald der Backend-Endpunkt mit erneuter Passwortbestätigung vorhanden ist.",
                );
              }}
            />
          </div>

          <button
            className="settings-secondary-action"
            onClick={() => {
              logout();

              router.replace(
                "/login",
              );
            }}
            type="button"
          >
            Abmelden
          </button>
        </SettingsSection>

        <SettingsSection
          description="Persönliches und berufliches Wissen bleiben voneinander getrennt."
          eyebrow="WORKSPACE"
          icon="◇"
          title="Arbeitsbereiche"
        >
          <div className="settings-workspace-selector">
            <WorkspaceOption
              active={
                activeWorkspaceId ===
                "private"
              }
              description="Persönliche Discoveries, Interessen und Wissensstrukturen."
              label="Privat"
              onClick={() => {
                void handleWorkspaceChange(
                  "private",
                );
              }}
            />

            <WorkspaceOption
              active={
                activeWorkspaceId ===
                "business"
              }
              description="Berufliche Inhalte, Projekte und Arbeitswissen."
              label="Geschäftlich"
              onClick={() => {
                void handleWorkspaceChange(
                  "business",
                );
              }}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          description="Steuere, welche KI-Systeme SaveWise für dein Wissen verwendet."
          eyebrow="INTELLIGENCE"
          icon="✦"
          title="Künstliche Intelligenz"
        >
          <ToggleRow
            description="Analysiert neue Links, Bilder und PDFs und erzeugt strukturierte Metadaten."
            label="KI-Inhaltsanalyse"
            onChange={(
              contentAnalysis,
            ) => {
              updateSettings(
                (current) => ({
                  ...current,

                  ai: {
                    ...current.ai,
                    contentAnalysis,
                  },
                }),
              );
            }}
            value={
              settings.ai
                .contentAnalysis
            }
          />

          <ToggleRow
            description="Verbindet Domänen, Topics und Discoveries zu deinem Wissensuniversum."
            label="Dynamischer Wissensgraph"
            onChange={(
              knowledgeGraph,
            ) => {
              updateSettings(
                (current) => ({
                  ...current,

                  ai: {
                    ...current.ai,
                    knowledgeGraph,
                  },
                }),
              );
            }}
            value={
              settings.ai
                .knowledgeGraph
            }
          />

          <ToggleRow
            description="Erkennt Wissenslücken, Trends und relevante neue externe Quellen."
            label="Autonome Recherche"
            onChange={(
              autonomousResearch,
            ) => {
              updateSettings(
                (current) => ({
                  ...current,

                  ai: {
                    ...current.ai,
                    autonomousResearch,
                  },
                }),
              );
            }}
            value={
              settings.ai
                .autonomousResearch
            }
          />

          <div className="settings-universe-optimization">
            <div>
              <div className="card-eyebrow">
                KNOWLEDGE ARCHITECT
              </div>

              <strong>
                Universum optimieren
              </strong>

              <p>
                SaveWise analysiert deine
                Discoveries neu und
                reorganisiert Domänen,
                Topics und Verbindungen.
              </p>
            </div>

            {isOptimizing ? (
              <div className="settings-optimization-progress">
                <span className="file-analysis-spinner" />

                <div>
                  <strong>
                    {
                      OPTIMIZATION_STAGES[
                        optimizationStage
                      ]
                    }
                  </strong>

                  <span>
                    KI arbeitet am
                    Wissensuniversum …
                  </span>
                </div>
              </div>
            ) : (
              <button
                className="settings-primary-action"
                disabled={
                  !settings.ai
                    .knowledgeGraph
                }
                onClick={() => {
                  void handleOptimizeUniverse();
                }}
                type="button"
              >
                ✦ Universum optimieren
              </button>
            )}

            {optimizationResult ? (
              <div className="settings-success-message">
                ✓ {optimizationResult}
              </div>
            ) : null}

            {optimizationError ? (
              <div className="settings-error-message">
                {
                  optimizationError
                }
              </div>
            ) : null}
          </div>
        </SettingsSection>

        <SettingsSection
          description="Cloud-Sicherung und Synchronisation mit deinen SaveWise-Geräten."
          eyebrow="STORAGE"
          icon="▤"
          title="Speicher & Synchronisation"
        >
          <div className="settings-sync-summary">
            <SettingsInfoRow
              label="Dropbox"
              value={
                connection?.connected
                  ? "Verbunden"
                  : "Nicht verbunden"
              }
            />

            <SettingsInfoRow
              label="Synchronisation"
              value={
                formatSyncStatus(
                  syncStatus,
                )
              }
            />

            <SettingsInfoRow
              label="Letzter Sync"
              value={
                lastSyncAt
                  ? formatDateTime(
                      lastSyncAt,
                      settings.dateTime
                        .dateFormat,
                      settings.dateTime
                        .timeFormat,
                    )
                  : "Noch nicht synchronisiert"
              }
            />
          </div>

          {connection?.connected ? (
            <button
              className="settings-secondary-action"
              disabled={
                syncStatus ===
                "syncing"
              }
              onClick={() => {
                void synchronize();
              }}
              type="button"
            >
              {syncStatus ===
              "syncing"
                ? "Synchronisiere …"
                : "Jetzt synchronisieren"}
            </button>
          ) : null}

          <div className="settings-existing-panel">
            <DropboxSettingsCard />
          </div>
        </SettingsSection>

        <SettingsSection
          description="Sprache der Oberfläche und bevorzugte Sprache für neue KI-Analysen."
          eyebrow="LANGUAGE"
          icon="A"
          title="Sprache"
        >
          <SelectRow<WebDisplayLanguage>
            label="Anzeigesprache"
            onChange={(
              display,
            ) => {
              updateSettings(
                (current) => ({
                  ...current,

                  language: {
                    ...current
                      .language,
                    display,
                  },
                }),
              );
            }}
            options={[
              [
                "system",
                "System",
              ],
              [
                "de",
                "Deutsch",
              ],
              [
                "en",
                "Englisch",
              ],
              [
                "fr",
                "Französisch",
              ],
              [
                "it",
                "Italienisch",
              ],
              [
                "es",
                "Spanisch",
              ],
            ]}
            value={
              settings.language
                .display
            }
          />

          <SelectRow<WebInputLanguage>
            label="Analysesprache"
            onChange={(
              input,
            ) => {
              updateSettings(
                (current) => ({
                  ...current,

                  language: {
                    ...current
                      .language,
                    input,
                  },
                }),
              );
            }}
            options={[
              [
                "auto",
                "Automatisch",
              ],
              [
                "de",
                "Deutsch",
              ],
              [
                "en",
                "Englisch",
              ],
              [
                "fr",
                "Französisch",
              ],
              [
                "it",
                "Italienisch",
              ],
              [
                "es",
                "Spanisch",
              ],
            ]}
            value={
              settings.language
                .input
            }
          />
        </SettingsSection>

        <SettingsSection
          description="Darstellung von Datum und Uhrzeit innerhalb von SaveWise."
          eyebrow="REGION"
          icon="◷"
          title="Datum & Zeit"
        >
          <SelectRow<WebDateFormat>
            label="Datumsformat"
            onChange={(
              dateFormat,
            ) => {
              updateSettings(
                (current) => ({
                  ...current,

                  dateTime: {
                    ...current
                      .dateTime,
                    dateFormat,
                  },
                }),
              );
            }}
            options={[
              [
                "day-month-year",
                "31.12.2026",
              ],
              [
                "month-day-year",
                "12/31/2026",
              ],
              [
                "year-month-day",
                "2026-12-31",
              ],
            ]}
            value={
              settings.dateTime
                .dateFormat
            }
          />

          <SelectRow<WebTimeFormat>
            label="Zeitformat"
            onChange={(
              timeFormat,
            ) => {
              updateSettings(
                (current) => ({
                  ...current,

                  dateTime: {
                    ...current
                      .dateTime,
                    timeFormat,
                  },
                }),
              );
            }}
            options={[
              [
                "system",
                "System",
              ],
              [
                "24-hour",
                "24 Stunden",
              ],
              [
                "12-hour",
                "12 Stunden",
              ],
            ]}
            value={
              settings.dateTime
                .timeFormat
            }
          />
        </SettingsSection>

        <SettingsSection
          description="Kontrolliere, welche Verarbeitung und optionale Telemetrie erlaubt ist."
          eyebrow="PRIVACY"
          icon="⬡"
          title="Datenschutz"
        >
          <ToggleRow
            description="Erlaubt vollständig anonyme technische Nutzungsstatistiken zur Verbesserung von SaveWise."
            label="Anonyme Nutzungsanalyse"
            onChange={(
              usageAnalytics,
            ) => {
              updateSettings(
                (current) => ({
                  ...current,

                  privacy: {
                    ...current
                      .privacy,
                    usageAnalytics,
                  },
                }),
              );
            }}
            value={
              settings.privacy
                .usageAnalytics
            }
          />

          <ToggleRow
            description="Erlaubt die Verarbeitung importierter Inhalte durch die SaveWise-KI. Ist dies deaktiviert, werden Link-, Bild- und PDF-Analysen blockiert."
            label="Externe Inhaltsverarbeitung"
            onChange={(
              externalContentProcessing,
            ) => {
              updateSettings(
                (current) => ({
                  ...current,

                  privacy: {
                    ...current
                      .privacy,
                    externalContentProcessing,
                  },
                }),
              );
            }}
            value={
              settings.privacy
                .externalContentProcessing
            }
          />

          <div className="settings-privacy-note">
            <strong>
              Private-by-design
            </strong>

            <p>
              Workspace-Trennung,
              Einstellungen und
              Cloud-Synchronisation bleiben
              unabhängig voneinander
              steuerbar.
            </p>
          </div>
        </SettingsSection>
      </div>

      <AccountSettingsModal
        account={
          account
        }
        action={
          accountAction
        }
        onClose={() => {
          setAccountAction(
            null,
          );
        }}
        onProfileChanged={
          async () => {
            await refreshSession();
          }
        }
        onEmailChangeRequested={() => {
          setAccountAction(
            null,
          );

          window.alert(
            "Bestätigungsmail wurde gesendet. Öffne den Link in der E-Mail und melde dich danach mit der neuen Adresse erneut an.",
          );

          logout();

          router.replace(
            "/login",
          );
        }}
      />
    </div>
  );
}

function SettingsSection({
  eyebrow,
  icon,
  title,
  description,
  children,
}: {
  eyebrow:
    string;

  icon:
    string;

  title:
    string;

  description:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <section className="settings-section-card">
      <header className="settings-section-header">
        <div className="settings-section-icon">
          {icon}
        </div>

        <div>
          <div className="card-eyebrow">
            {eyebrow}
          </div>

          <h2>
            {title}
          </h2>

          <p>
            {description}
          </p>
        </div>
      </header>

      <div className="settings-section-body">
        {children}
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label:
    string;

  description:
    string;

  value:
    boolean;

  onChange:
    (value: boolean) => void;
}) {
  return (
    <div className="settings-control-row">
      <div className="settings-control-copy">
        <strong>
          {label}
        </strong>

        <span>
          {description}
        </span>
      </div>

      <button
        aria-checked={
          value
        }
        className={
          value
            ? "settings-switch settings-switch-active"
            : "settings-switch"
        }
        onClick={() => {
          onChange(
            !value,
          );
        }}
        role="switch"
        type="button"
      >
        <span />
      </button>
    </div>
  );
}

function SelectRow<
  T extends string,
>({
  label,
  value,
  options,
  onChange,
}: {
  label:
    string;

  value:
    T;

  options:
    Array<
      readonly [
        T,
        string,
      ]
    >;

  onChange:
    (value: T) => void;
}) {
  return (
    <label className="settings-select-row">
      <span>
        {label}
      </span>

      <select
        onChange={(event) => {
          onChange(
            event.target
              .value as T,
          );
        }}
        value={
          value
        }
      >
        {options.map(
          ([
            optionValue,
            optionLabel,
          ]) => (
            <option
              key={
                optionValue
              }
              value={
                optionValue
              }
            >
              {
                optionLabel
              }
            </option>
          ),
        )}
      </select>
    </label>
  );
}

function WorkspaceOption({
  label,
  description,
  active,
  onClick,
}: {
  label:
    string;

  description:
    string;

  active:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      className={
        active
          ? "settings-workspace-option settings-workspace-option-active"
          : "settings-workspace-option"
      }
      onClick={
        onClick
      }
      type="button"
    >
      <span className="settings-workspace-indicator">
        {active
          ? "✓"
          : ""}
      </span>

      <span>
        <strong>
          {label}
        </strong>

        <small>
          {description}
        </small>
      </span>
    </button>
  );
}

function AccountActionRow({
  label,
  value,
  secondaryValue,
  actionLabel,
  danger = false,
  onClick,
}: {
  label:
    string;

  value:
    string;

  secondaryValue?:
    string;

  actionLabel:
    string;

  danger?:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <div
      className={
        danger
          ? "settings-account-action-row settings-account-action-row-danger"
          : "settings-account-action-row"
      }
    >
      <div className="settings-account-action-copy">
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>

        {secondaryValue ? (
          <small>
            {secondaryValue}
          </small>
        ) : null}
      </div>

      <button
        className={
          danger
            ? "settings-account-action-button settings-account-action-button-danger"
            : "settings-account-action-button"
        }
        onClick={
          onClick
        }
        type="button"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function SettingsInfoRow({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="settings-info-row">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function SystemMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="settings-system-metric">
      <strong>
        {value}
      </strong>

      <span>
        {label}
      </span>
    </div>
  );
}

function formatSyncStatus(
  value:
    string,
): string {
  switch (value) {
    case "syncing":
      return "Synchronisiert gerade";

    case "synced":
      return "Synchronisiert";

    case "pending":
      return "Änderungen ausstehend";

    case "error":
      return "Fehler";

    default:
      return "Bereit";
  }
}

function formatDateTime(
  value:
    string,

  dateFormat:
    WebDateFormat,

  timeFormat:
    WebTimeFormat,
): string {
  const locale =
    dateFormat ===
    "month-day-year"
      ? "en-US"
      : dateFormat ===
          "year-month-day"
        ? "sv-SE"
        : "de-CH";

  return new Intl.DateTimeFormat(
    locale,
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",

      hour12:
        timeFormat ===
        "12-hour"
          ? true
          : timeFormat ===
              "24-hour"
            ? false
            : undefined,
    },
  ).format(
    new Date(
      value,
    ),
  );
}
