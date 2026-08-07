export type WorkspaceId =
  | "private"
  | "business";

export type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "pending"
  | "offline"
  | "error";

export type DesktopNavigationItem = {
  href: string;
  icon: string;
  label: string;
};
