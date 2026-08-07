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
  DiscoveryProvider,
} from "@/providers/discovery-provider";

import {
  SearchProvider,
} from "@/providers/search-provider";

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
          <DiscoveryProvider>
            <CaptureProvider>
              <SearchProvider>
                {children}
              </SearchProvider>
            </CaptureProvider>
          </DiscoveryProvider>
        </SyncProvider>
      </WorkspaceProvider>
    </AccountProvider>
  );
}
