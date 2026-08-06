"use client";

import type {
  ReactNode,
} from "react";

import {
  AccountProvider,
} from "@/providers/account-provider";

import {
  CaptureProvider,
} from "@/providers/capture-provider";

import {
  SyncProvider,
} from "@/providers/sync-provider";

import {
  WorkspaceProvider,
} from "@/providers/workspace-provider";

export function AppProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AccountProvider>
      <WorkspaceProvider>
        <SyncProvider>
          <CaptureProvider>
            {children}
          </CaptureProvider>
        </SyncProvider>
      </WorkspaceProvider>
    </AccountProvider>
  );
}
