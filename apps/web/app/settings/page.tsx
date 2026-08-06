import {
  DesktopShell,
} from "@/components/desktop/desktop-shell";

import {
  DropboxSettingsCard,
} from "@/components/settings/dropbox-settings-card";

export default function SettingsPage() {
  return (
    <DesktopShell>
      <section className="settings-page">
        <div className="settings-introduction">
          <div>
            <div className="card-eyebrow">
              VERBUNDENE DIENSTE
            </div>

            <h2>
              Cloud und Synchronisation
            </h2>

            <p>
              Der Workspace verwendet
              dasselbe SaveWise-Konto und
              dieselbe Dropbox-Verbindung
              wie dein iPhone.
            </p>
          </div>
        </div>

        <DropboxSettingsCard />
      </section>
    </DesktopShell>
  );
}
