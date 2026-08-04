import { promises as fs } from "node:fs";
import path from "node:path";

import type { AnonymousAnalyticsEvent } from "@savewise/shared";

export type StoredAnonymousAnalyticsEvent = AnonymousAnalyticsEvent & {
  receivedAt: string;
};

const RETENTION_DAYS = 90;
const MAX_EVENTS = 250_000;
const DATA_DIRECTORY = path.resolve(process.cwd(), "data");
const ANALYTICS_FILE = path.join(DATA_DIRECTORY, "anonymous-analytics.json");

let writeQueue: Promise<void> = Promise.resolve();

export function appendAnonymousAnalyticsEvent(
  event: AnonymousAnalyticsEvent,
): Promise<void> {
  return enqueue(async () => {
    const events = await loadEvents();
    const retained = retainRecent(events);
    retained.push({ ...event, receivedAt: new Date().toISOString() });
    await saveEvents(retained.slice(-MAX_EVENTS));
  });
}

export function deleteAnonymousAnalyticsEvents(anonymousId: string): Promise<number> {
  let deleted = 0;
  return enqueue(async () => {
    const events = await loadEvents();
    const retained = events.filter((event) => {
      if (event.anonymousId !== anonymousId) return true;
      deleted += 1;
      return false;
    });
    await saveEvents(retainRecent(retained));
  }).then(() => deleted);
}

export const anonymousAnalyticsRetentionDays = RETENTION_DAYS;

function enqueue(work: () => Promise<void>): Promise<void> {
  const next = writeQueue.then(work, work);
  writeQueue = next.catch(() => undefined);
  return next;
}

async function loadEvents(): Promise<StoredAnonymousAnalyticsEvent[]> {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true });
  try {
    const content = await fs.readFile(ANALYTICS_FILE, "utf8");
    const parsed: unknown = JSON.parse(content);
    return Array.isArray(parsed) ? parsed.filter(isStoredEvent) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function saveEvents(events: StoredAnonymousAnalyticsEvent[]): Promise<void> {
  const temporaryFile = `${ANALYTICS_FILE}.tmp`;
  await fs.writeFile(temporaryFile, JSON.stringify(events), "utf8");
  await fs.rename(temporaryFile, ANALYTICS_FILE);
}

function retainRecent(events: StoredAnonymousAnalyticsEvent[]): StoredAnonymousAnalyticsEvent[] {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1_000;
  return events.filter((event) => new Date(event.receivedAt).getTime() >= cutoff);
}

function isStoredEvent(value: unknown): value is StoredAnonymousAnalyticsEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<StoredAnonymousAnalyticsEvent>;
  return typeof event.anonymousId === "string" &&
    typeof event.event === "string" &&
    typeof event.receivedAt === "string";
}
