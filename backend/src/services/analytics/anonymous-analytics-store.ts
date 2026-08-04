import type {
  AnonymousAnalyticsEvent,
} from "@savewise/shared";

import { storagePaths } from "../../config/storage-paths";
import {
  readJsonFile,
  writeJsonFile,
} from "../../persistence/shared/json-file-store";

export type StoredAnonymousAnalyticsEvent =
  AnonymousAnalyticsEvent & {
    receivedAt: string;
  };

const RETENTION_DAYS = 90;

const MAX_EVENTS = 250_000;

export function appendAnonymousAnalyticsEvent(
  event: AnonymousAnalyticsEvent,
): Promise<void> {
  return updateEvents(
    (events) => {
      const retained =
        retainRecent(events);

      retained.push({
        ...event,

        receivedAt:
          new Date().toISOString(),
      });

      return retained.slice(
        -MAX_EVENTS,
      );
    },
  ).then(() => undefined);
}

export async function deleteAnonymousAnalyticsEvents(
  anonymousId: string,
): Promise<number> {
  let deletedEvents = 0;

  await updateEvents(
    (events) =>
      retainRecent(
        events.filter(
          (event) => {
            if (
              event.anonymousId !==
              anonymousId
            ) {
              return true;
            }

            deletedEvents += 1;

            return false;
          },
        ),
      ),
  );

  return deletedEvents;
}

export const anonymousAnalyticsRetentionDays =
  RETENTION_DAYS;

async function updateEvents(
  updater: (
    events: StoredAnonymousAnalyticsEvent[],
  ) => StoredAnonymousAnalyticsEvent[],
): Promise<
  StoredAnonymousAnalyticsEvent[]
> {
  const events =
    await loadEvents();

  const updatedEvents =
    updater(events);

  await writeJsonFile(
    storagePaths
      .anonymousAnalytics,
    updatedEvents,
    false,
  );

  return updatedEvents;
}

async function loadEvents(): Promise<
  StoredAnonymousAnalyticsEvent[]
> {
  return readJsonFile(
    storagePaths
      .anonymousAnalytics,
    () => [],
    isStoredEventArray,
  );
}

function retainRecent(
  events: StoredAnonymousAnalyticsEvent[],
): StoredAnonymousAnalyticsEvent[] {
  const cutoff =
    Date.now() -
    RETENTION_DAYS *
      24 *
      60 *
      60 *
      1_000;

  return events.filter(
    (event) =>
      new Date(
        event.receivedAt,
      ).getTime() >= cutoff,
  );
}

function isStoredEventArray(
  value: unknown,
): value is StoredAnonymousAnalyticsEvent[] {
  return (
    Array.isArray(value) &&
    value.every(
      isStoredEvent,
    )
  );
}

function isStoredEvent(
  value: unknown,
): value is StoredAnonymousAnalyticsEvent {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const event =
    value as Partial<StoredAnonymousAnalyticsEvent>;

  return (
    typeof event.anonymousId ===
      "string" &&
    typeof event.event ===
      "string" &&
    typeof event.receivedAt ===
      "string"
  );
}