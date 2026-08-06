"use client";

import {
  useWorkspace,
} from "@/providers/workspace-provider";

export function WorkspaceSwitcher() {
  const {
    activeWorkspaceId,
    setActiveWorkspaceId,
  } =
    useWorkspace();

  return (
    <div className="workspace-switcher">
      <button
        className={
          activeWorkspaceId ===
          "private"
            ? "workspace-option workspace-option-active"
            : "workspace-option"
        }
        onClick={() => {
          setActiveWorkspaceId(
            "private",
          );
        }}
        type="button"
      >
        Privat
      </button>

      <button
        className={
          activeWorkspaceId ===
          "business"
            ? "workspace-option workspace-option-active"
            : "workspace-option"
        }
        onClick={() => {
          setActiveWorkspaceId(
            "business",
          );
        }}
        type="button"
      >
        Geschäftlich
      </button>
    </div>
  );
}
