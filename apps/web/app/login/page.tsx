"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useAccount,
} from "@/providers/account-provider";

export default function LoginPage() {
  const router =
    useRouter();

  const {
    account,
    status,
    error,
    login,
  } =
    useAccount();

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    isSubmitting,
    setSubmitting,
  ] =
    useState(false);

  useEffect(() => {
    if (
      status ===
        "authenticated" &&
      account
    ) {
      router.replace(
        "/universe",
      );
    }
  }, [
    account,
    router,
    status,
  ]);

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !email.trim() ||
      !password
    ) {
      return;
    }

    setSubmitting(true);

    try {
      await login(
        email,
        password,
      );

      router.replace(
        "/universe",
      );
    } catch {
      // Fehlermeldung wird vom AccountProvider gesetzt.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <div className="login-brand">
          <div className="brand-mark">
            S
          </div>

          <div>
            <div className="login-brand-name">
              SaveWise
            </div>

            <div className="login-brand-caption">
              Personal Knowledge Workspace
            </div>
          </div>
        </div>

        <div className="login-heading">
          <div className="page-eyebrow">
            WILLKOMMEN ZURÜCK
          </div>

          <h1>
            Dein Wissen wartet.
          </h1>

          <p>
            Melde dich mit demselben
            SaveWise-Konto an, das du
            auf deinem iPhone verwendest.
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={
            handleSubmit
          }
        >
          <label className="form-field">
            <span>
              E-Mail-Adresse
            </span>

            <input
              autoComplete="email"
              autoFocus
              onChange={(event) => {
                setEmail(
                  event.target.value,
                );
              }}
              placeholder="name@beispiel.ch"
              type="email"
              value={email}
            />
          </label>

          <label className="form-field">
            <span>
              Passwort
            </span>

            <input
              autoComplete="current-password"
              onChange={(event) => {
                setPassword(
                  event.target.value,
                );
              }}
              placeholder="Dein Passwort"
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <div className="login-error">
              {error}
            </div>
          ) : null}

          <button
            className="login-button"
            disabled={
              isSubmitting ||
              !email.trim() ||
              !password
            }
            type="submit"
          >
            {isSubmitting
              ? "Anmeldung wird geprüft …"
              : "Anmelden"}
          </button>
        </form>

        <div className="login-security">
          <span>
            ◉
          </span>

          <p>
            Deine Sitzung wird nur für
            diese Browsersitzung gespeichert.
            Dropbox-Tokens bleiben
            verschlüsselt auf Railway.
          </p>
        </div>
      </section>

      <aside className="login-visual">
        <div className="login-visual-content">
          <div className="page-eyebrow">
            SAVEWISE UNIVERSE
          </div>

          <h2>
            Sammeln auf dem iPhone.
            <br />
            Denken im Workspace.
          </h2>

          <p>
            Alle Discoveries, Notizen,
            Domänen und Verbindungen
            werden über dein SaveWise-Konto
            zusammengeführt.
          </p>

          <div className="login-feature-list">
            <div>
              <strong>
                Erfassen
              </strong>

              <span>
                Links, Notizen, PDFs,
                Bilder und Sprache
              </span>
            </div>

            <div>
              <strong>
                Verknüpfen
              </strong>

              <span>
                Domänen, Themen und
                fachliche Brücken
              </span>
            </div>

            <div>
              <strong>
                Verstehen
              </strong>

              <span>
                Muster, Wissenslücken
                und neue Erkenntnisse
              </span>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
