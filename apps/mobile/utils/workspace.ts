import type {
  Discovery,
} from "@/types/discovery";

import type {
  WorkspaceId,
} from "@/types/app-settings";

export type WorkspaceDefinition = {
  id: WorkspaceId;
  label: string;
  shortLabel: string;
  icon:
    | "home-outline"
    | "briefcase-outline";
  activeIcon:
    | "home"
    | "briefcase";
  tone:
    | "cyan"
    | "violet";
};

export const WORKSPACES:
  readonly WorkspaceDefinition[] = [
  {
    id: "private",
    label: "Privat",
    shortLabel: "PRIVAT",
    icon: "home-outline",
    activeIcon: "home",
    tone: "cyan",
  },

  {
    id: "business",
    label: "Geschäftlich",
    shortLabel: "GESCHÄFTLICH",
    icon: "briefcase-outline",
    activeIcon: "briefcase",
    tone: "violet",
  },
] as const;

export function getDiscoveryWorkspaceId(
  discovery:
    Pick<Discovery, "workspaceId">,
): WorkspaceId {
  return discovery.workspaceId ===
    "business"
    ? "business"
    : "private";
}

export function belongsToWorkspace(
  discovery:
    Pick<Discovery, "workspaceId">,
  workspaceId: WorkspaceId,
): boolean {
  return (
    getDiscoveryWorkspaceId(
      discovery,
    ) === workspaceId
  );
}

export function filterDiscoveriesByWorkspace(
  discoveries: Discovery[],
  workspaceId: WorkspaceId,
): Discovery[] {
  return discoveries.filter(
    (discovery) =>
      belongsToWorkspace(
        discovery,
        workspaceId,
      ),
  );
}

export function getWorkspaceDefinition(
  workspaceId: WorkspaceId,
): WorkspaceDefinition {
  return (
    WORKSPACES.find(
      (workspace) =>
        workspace.id ===
        workspaceId,
    ) ?? WORKSPACES[0]
  );
}
