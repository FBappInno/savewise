import {
  DesktopShell,
} from "@/components/desktop/desktop-shell";

export default function KnowledgePage() {
  return (
    <DesktopShell>
      <section className="empty-workspace">
        <div className="empty-icon">
          ◇
        </div>

        <h2>
          Wissen analysieren
        </h2>

        <p>
          Diese Ansicht wird später den
          Wissensgraphen, Zusammenhänge
          und den persönlichen
          KI-Assistenten enthalten.
        </p>
      </section>
    </DesktopShell>
  );
}
