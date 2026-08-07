import {
  DesktopShell,
} from "@/components/desktop/desktop-shell";

import {
  ResearchWorkspace,
} from "@/components/research/research-workspace";

export default function ResearchPage() {
  return (
    <DesktopShell>
      <ResearchWorkspace />
    </DesktopShell>
  );
}
