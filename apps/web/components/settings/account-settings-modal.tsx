"use client";

import type {
  AccountSummary,
} from "@/types/account";

import {
  useEffect,
  useState,
} from "react";

import {
  changeEmail,
  changePassword,
  changeUsername,
} from "@/services/account-settings-client";

export type AccountSettingsAction =
  | "username"
  | "email"
  | "password";

export function AccountSettingsModal({
  action,
  account,
  onClose,
  onProfileChanged,
  onEmailChangeRequested,
}: {
  action:
    AccountSettingsAction | null;

  account:
    AccountSummary | null;

  onClose:
    () => void;

  onProfileChanged:
    () => Promise<void>;

  onEmailChangeRequested:
    () => void;
}) {
  const [
    username,
    setUsername,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    currentPassword,
    setCurrentPassword,
  ] =
    useState("");

  const [
    newPassword,
    setNewPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

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

  useEffect(() => {
    setUsername(
      account?.username ??
      "",
    );

    setEmail(
      account?.email ??
      "",
    );

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }, [
    action,
    account,
  ]);

  if (
    !action ||
    !account
  ) {
    return null;
  }

  async function handleSubmit():
  Promise<void> {
    setError(null);

    if (
      action ===
      "username"
    ) {
      if (
        username.trim()
          .length < 2
      ) {
        setError(
          "Der Benutzername muss mindestens 2 Zeichen enthalten.",
        );

        return;
      }

      setSaving(true);

      try {
        await changeUsername(
          username.trim(),
        );

        await onProfileChanged();

        onClose();
      } catch (saveError) {
        setError(
          getErrorMessage(
            saveError,
          ),
        );
      } finally {
        setSaving(false);
      }

      return;
    }

    if (
      action ===
      "email"
    ) {
      if (
        !email.includes("@") ||
        !currentPassword
      ) {
        setError(
          "Bitte gib die neue E-Mail-Adresse und dein aktuelles Passwort ein.",
        );

        return;
      }

      setSaving(true);

      try {
        await changeEmail({
          currentPassword,
          newEmail:
            email.trim(),
        });

        onEmailChangeRequested();
      } catch (saveError) {
        setError(
          getErrorMessage(
            saveError,
          ),
        );
      } finally {
        setSaving(false);
      }

      return;
    }

    if (
      newPassword.length <
      10
    ) {
      setError(
        "Das neue Passwort muss mindestens 10 Zeichen enthalten.",
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "Die beiden neuen Passwörter stimmen nicht überein.",
      );

      return;
    }

    if (!currentPassword) {
      setError(
        "Bitte gib dein aktuelles Passwort ein.",
      );

      return;
    }

    setSaving(true);

    try {
      await changePassword({
        currentPassword,
        newPassword,
      });

      await onProfileChanged();

      onClose();

      window.alert(
        "Passwort geändert. Andere bestehende Sitzungen wurden aus Sicherheitsgründen abgemeldet.",
      );
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="account-settings-modal-backdrop"
      onMouseDown={
        onClose
      }
    >
      <section
        aria-modal="true"
        className="account-settings-modal"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        role="dialog"
      >
        <header>
          <div>
            <div className="card-eyebrow">
              KONTO
            </div>

            <h3>
              {action ===
              "username"
                ? "Benutzername ändern"
                : action ===
                    "email"
                  ? "E-Mail-Adresse ändern"
                  : "Passwort ändern"}
            </h3>
          </div>

          <button
            aria-label="Schließen"
            className="modal-close-button"
            onClick={
              onClose
            }
            type="button"
          >
            ×
          </button>
        </header>

        <div className="account-settings-modal-body">
          {action ===
          "username" ? (
            <label className="form-field">
              <span>
                Benutzername
              </span>

              <input
                autoFocus
                maxLength={80}
                onChange={(event) => {
                  setUsername(
                    event.target.value,
                  );
                }}
                value={
                  username
                }
              />
            </label>
          ) : null}

          {action ===
          "email" ? (
            <>
              <label className="form-field">
                <span>
                  Neue E-Mail-Adresse
                </span>

                <input
                  autoFocus
                  onChange={(event) => {
                    setEmail(
                      event.target.value,
                    );
                  }}
                  type="email"
                  value={
                    email
                  }
                />
              </label>

              <label className="form-field">
                <span>
                  Aktuelles Passwort
                </span>

                <input
                  autoComplete="current-password"
                  onChange={(event) => {
                    setCurrentPassword(
                      event.target.value,
                    );
                  }}
                  type="password"
                  value={
                    currentPassword
                  }
                />
              </label>

              <div className="account-settings-info">
                Nach der Änderung senden
                wir einen Bestätigungslink
                an die neue Adresse. Danach
                meldest du dich mit der neuen
                E-Mail-Adresse wieder an.
              </div>
            </>
          ) : null}

          {action ===
          "password" ? (
            <>
              <label className="form-field">
                <span>
                  Aktuelles Passwort
                </span>

                <input
                  autoComplete="current-password"
                  autoFocus
                  onChange={(event) => {
                    setCurrentPassword(
                      event.target.value,
                    );
                  }}
                  type="password"
                  value={
                    currentPassword
                  }
                />
              </label>

              <label className="form-field">
                <span>
                  Neues Passwort
                </span>

                <input
                  autoComplete="new-password"
                  minLength={10}
                  onChange={(event) => {
                    setNewPassword(
                      event.target.value,
                    );
                  }}
                  type="password"
                  value={
                    newPassword
                  }
                />

                <small>
                  Mindestens 10 Zeichen
                </small>
              </label>

              <label className="form-field">
                <span>
                  Neues Passwort bestätigen
                </span>

                <input
                  autoComplete="new-password"
                  minLength={10}
                  onChange={(event) => {
                    setConfirmPassword(
                      event.target.value,
                    );
                  }}
                  type="password"
                  value={
                    confirmPassword
                  }
                />
              </label>
            </>
          ) : null}

          {error ? (
            <div className="settings-error-message">
              {error}
            </div>
          ) : null}

          <div className="account-settings-modal-actions">
            <button
              className="settings-secondary-action"
              disabled={
                isSaving
              }
              onClick={
                onClose
              }
              type="button"
            >
              Abbrechen
            </button>

            <button
              className="settings-primary-action"
              disabled={
                isSaving
              }
              onClick={() => {
                void handleSubmit();
              }}
              type="button"
            >
              {isSaving
                ? "Speichere …"
                : action ===
                    "email"
                  ? "Bestätigung senden"
                  : "Änderung speichern"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function getErrorMessage(
  error:
    unknown,
): string {
  return error instanceof Error
    ? error.message
    : "Die Änderung konnte nicht gespeichert werden.";
}
