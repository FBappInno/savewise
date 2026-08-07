import {
  DesktopShell,
} from "@/components/desktop/desktop-shell";

import {
  SettingsWorkspace,
} from "@/components/settings/settings-workspace";

export default function SettingsPage() {
  return (
    <DesktopShell>
      <SettingsWorkspace />
    </DesktopShell>
  );
}
