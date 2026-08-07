"use client";

import type {
  ReactNode,
} from "react";

import {
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  CaptureModal,
} from "@/components/capture/capture-modal";

import {
  DesktopHeader,
} from "@/components/desktop/desktop-header";

import {
  DesktopSidebar,
} from "@/components/desktop/desktop-sidebar";

import {
  SyncStatusBar,
} from "@/components/desktop/sync-status-bar";

import {
  useAccount,
} from "@/providers/account-provider";

export function DesktopShell({
  children,
}: {
  children: ReactNode;
}) {
  const router =
    useRouter();

  const {
    status,
  } =
    useAccount();

  useEffect(() => {
    if (
      status ===
      "anonymous"
    ) {
      router.replace(
        "/login",
      );
    }
  }, [
    router,
    status,
  ]);

  if (
    status ===
    "loading"
  ) {
    return (
      <main className="workspace-loading">
        <div className="workspace-loading-mark">
          S
        </div>

        <p>
          SaveWise Workspace wird geladen …
        </p>
      </main>
    );
  }

  if (
    status !==
    "authenticated"
  ) {
    return null;
  }

  return (
    <div className="desktop-app">
      <DesktopSidebar />

      <div className="desktop-main">
        <DesktopHeader />

        <main className="desktop-content">
          {children}
        </main>

        <SyncStatusBar />
      </div>

      <CaptureModal />
    </div>
  );
}
