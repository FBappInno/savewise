import path from "node:path";

import { runtimeConfig } from "./runtime-config";

export const storagePaths = {
  dataDirectory:
    runtimeConfig.dataDirectory,

  discoveries:
    path.join(
      runtimeConfig.dataDirectory,
      "discoveries.json",
    ),

  knowledgeLibrary:
    path.join(
      runtimeConfig.dataDirectory,
      "knowledge-library.json",
    ),

  knowledgeGraph:
    path.join(
      runtimeConfig.dataDirectory,
      "knowledge-graph.json",
    ),

  knowledgeGraphOverrides:
    path.join(
      runtimeConfig.dataDirectory,
      "knowledge-graph-overrides.json",
    ),

  personalAssistantProfile:
    path.join(
      runtimeConfig.dataDirectory,
      "personal-assistant-profile.json",
    ),

  researchState:
    path.join(
      runtimeConfig.dataDirectory,
      "research-state.json",
    ),

  personalIntelligenceState:
    path.join(
      runtimeConfig.dataDirectory,
      "personal-intelligence-state.json",
    ),

  anonymousAnalytics:
    path.join(
      runtimeConfig.dataDirectory,
      "anonymous-analytics.json",
    ),

  accounts:
    path.join(
      runtimeConfig.dataDirectory,
      "accounts.json",
    ),
  dropboxConnections:
    path.join(
      runtimeConfig.dataDirectory,
      "dropbox-connections.json",
    ),

} as const;
