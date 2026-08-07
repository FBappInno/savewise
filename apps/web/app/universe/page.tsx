import {
  Suspense,
} from "react";

import {
  DesktopShell,
} from "@/components/desktop/desktop-shell";

import {
  UniverseWorkspace,
} from "@/components/universe/universe-workspace";

export default function UniversePage() {
  return (
    <DesktopShell>
      <Suspense
        fallback={
          <div className="workspace-loading-inline">
            Universum wird geladen …
          </div>
        }
      >
        <UniverseWorkspace />
      </Suspense>
    </DesktopShell>
  );
}
