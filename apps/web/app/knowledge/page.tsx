import {
  DesktopShell,
} from "@/components/desktop/desktop-shell";

import {
  KnowledgeWorkspace,
} from "@/components/knowledge/knowledge-workspace";

export default function KnowledgePage() {
  return (
    <DesktopShell>
      <KnowledgeWorkspace />
    </DesktopShell>
  );
}
