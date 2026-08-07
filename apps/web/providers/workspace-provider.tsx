"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  WorkspaceId,
} from "@/types/desktop";

const STORAGE_KEY =
  "savewise.desktop.workspace.v1";

type WorkspaceContextValue = {
  activeWorkspaceId: WorkspaceId;
  setActiveWorkspaceId:
    (workspaceId: WorkspaceId) => void;
};

const WorkspaceContext =
  createContext<
    WorkspaceContextValue | null
  >(null);

export function WorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    activeWorkspaceId,
    setActiveWorkspaceIdState,
  ] =
    useState<WorkspaceId>(
      "private",
    );

  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        STORAGE_KEY,
      );

    if (
      stored === "private" ||
      stored === "business"
    ) {
      setActiveWorkspaceIdState(
        stored,
      );
    }
  }, []);

  function setActiveWorkspaceId(
    workspaceId: WorkspaceId,
  ) {
    setActiveWorkspaceIdState(
      workspaceId,
    );

    window.localStorage.setItem(
      STORAGE_KEY,
      workspaceId,
    );
  }

  const value =
    useMemo(
      () => ({
        activeWorkspaceId,
        setActiveWorkspaceId,
      }),
      [activeWorkspaceId],
    );

  return (
    <WorkspaceContext.Provider
      value={value}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace():
WorkspaceContextValue {
  const context =
    useContext(
      WorkspaceContext,
    );

  if (!context) {
    throw new Error(
      "useWorkspace muss innerhalb des WorkspaceProvider verwendet werden.",
    );
  }

  return context;
}
