import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";
import { Platform } from "react-native";

import { loadAppSettings } from "@/services/settings-storage";
import type {
  AnalyticsErrorKind,
  AnonymousAnalyticsEvent,
  AnonymousAnalyticsEventName,
  AnonymousAnalyticsMetrics,
} from "@savewise/shared";

const ANONYMOUS_ID_KEY = "savewise.analytics.anonymous-id.v1";

export async function trackAnonymousEvent(
  event: AnonymousAnalyticsEventName,
  metrics?: AnonymousAnalyticsMetrics,
): Promise<void> {
  const settings = await loadAppSettings();
  if (settings.privacy.analyticsConsent !== "granted" || !settings.privacy.usageAnalytics) return;

  const payload: AnonymousAnalyticsEvent = {
    anonymousId: await getOrCreateAnonymousId(),
    event,
    platform: normalizePlatform(Platform.OS),
    appVersion: Constants.expoConfig?.version ?? "unknown",
    timestamp: new Date().toISOString(),
    ...(metrics ? { metrics } : {}),
  };

  try {
    await analyticsRequest("/api/analytics/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    // Analytics must never interrupt or degrade the product experience.
  }
}

export async function deleteMyAnonymousAnalytics(): Promise<number> {
  const anonymousId = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
  if (!anonymousId) return 0;
  const response = await analyticsRequest<{ deletedEvents: number }>(
    `/api/analytics/devices/${encodeURIComponent(anonymousId)}`,
    { method: "DELETE" },
  );
  await AsyncStorage.removeItem(ANONYMOUS_ID_KEY);
  return response.deletedEvents;
}

export function classifyAnonymousError(error: unknown): AnalyticsErrorKind {
  if (!(error instanceof Error)) return "unknown";
  const normalized = `${error.name} ${error.message}`.toLowerCase();
  if (normalized.includes("timeout") || normalized.includes("zeit")) return "timeout";
  if (normalized.includes("network") || normalized.includes("fetch")) return "network";
  if (normalized.includes("401") || normalized.includes("403") || normalized.includes("auth")) return "authentication";
  if (normalized.includes("valid") || normalized.includes("ungültig")) return "validation";
  if (normalized.includes("server") || /\b5\d\d\b/.test(normalized)) return "server";
  if (normalized.includes("unavailable") || normalized.includes("nicht verfügbar")) return "unavailable";
  return "unknown";
}

async function getOrCreateAnonymousId(): Promise<string> {
  const existing = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) return existing;
  const created = randomUUID();
  await AsyncStorage.setItem(ANONYMOUS_ID_KEY, created);
  return created;
}

async function analyticsRequest<T = void>(path: string, options: RequestInit): Promise<T> {
  const apiUrl = process.env.EXPO_PUBLIC_ANALYTICS_API_URL ?? process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) throw new Error("Analytics API is not configured.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, "")}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Analytics API failed (${response.status}).`);
    return response.status === 204 ? undefined as T : response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizePlatform(platform: string): AnonymousAnalyticsEvent["platform"] {
  return platform === "ios" || platform === "android" || platform === "web"
    ? platform
    : "unknown";
}
