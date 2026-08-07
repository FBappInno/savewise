import {
  DesktopShell,
} from "@/components/desktop/desktop-shell";

export default function ResearchPage() {
  return (
    <DesktopShell>
      <section className="empty-workspace">
        <div className="empty-icon">
          ⌁
        </div>

        <h2>
          Autonome Recherche
        </h2>

        <p>
          Hier erscheinen später
          Recherchemissionen, neue Quellen
          und erkannte Wissenslücken.
        </p>
      </section>
    </DesktopShell>
  );
}
