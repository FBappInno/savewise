export const anonymousAnalyticsEvents = [
  "AppStart",
  "AppClosed",
  "DiscoveryCreated",
  "DiscoveryDeleted",
  "DiscoveryEdited",
  "ImportStarted",
  "ImportFinished",
  "ImportFailed",
  "KnowledgeGraphBuilt",
  "LibraryOpened",
  "InsightOpened",
  "TopicOpened",
  "SearchUsed",
  "AIChatQuestion",
  "ResearchAgentStarted",
  "ResearchSuggestionAccepted",
  "ResearchSuggestionIgnored",
  "SyncStarted",
  "SyncFinished",
  "SyncFailed",
  "ErrorOccurred",
  "AppCrashed",
] as const;

export type AnonymousAnalyticsEventName = typeof anonymousAnalyticsEvents[number];

export const analyticsOperations = [
  "app",
  "discovery-import",
  "discovery-edit",
  "discovery-delete",
  "knowledge-graph",
  "library",
  "search",
  "ai-chat",
  "research",
  "cloud-sync",
] as const;

export type AnalyticsOperation = typeof analyticsOperations[number];

export const analyticsErrorKinds = [
  "network",
  "timeout",
  "validation",
  "authentication",
  "server",
  "unavailable",
  "unknown",
] as const;

export type AnalyticsErrorKind = typeof analyticsErrorKinds[number];

export type AnonymousAnalyticsMetrics = {
  durationMs?: number;
  itemCount?: number;
  operation?: AnalyticsOperation;
  errorKind?: AnalyticsErrorKind;
};

export type AnonymousAnalyticsEvent = {
  anonymousId: string;
  event: AnonymousAnalyticsEventName;
  platform: "ios" | "android" | "web" | "unknown";
  appVersion: string;
  timestamp: string;
  metrics?: AnonymousAnalyticsMetrics;
};
