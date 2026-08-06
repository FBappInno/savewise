import {
  DesktopShell,
} from "@/components/desktop/desktop-shell";

export default function UniversePage() {
  return (
    <DesktopShell>
      <section className="content-grid">
        <article className="hero-card">
          <div className="card-eyebrow">
            DEIN WISSENSRAUM
          </div>

          <h2>
            Das Universum entsteht hier.
          </h2>

          <p>
            Im nächsten Schritt verbinden
            wir diese Ansicht mit deinen
            Discoveries und Dropbox.
          </p>
        </article>

        <article className="metric-card">
          <span>
            Discoveries
          </span>

          <strong>
            —
          </strong>
        </article>

        <article className="metric-card">
          <span>
            Themen
          </span>

          <strong>
            —
          </strong>
        </article>

        <article className="metric-card">
          <span>
            Verbindungen
          </span>

          <strong>
            —
          </strong>
        </article>
      </section>
    </DesktopShell>
  );
}
