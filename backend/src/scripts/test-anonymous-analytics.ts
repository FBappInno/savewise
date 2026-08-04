import assert from "node:assert/strict";
import test from "node:test";

import { AnonymousAnalyticsEventSchema } from "../services/analytics/anonymous-analytics-schema";

const validEvent = {
  anonymousId: "a18d4c7f-4bb8-4b22-8ddd-9f6b83e4f947",
  event: "ImportFinished",
  platform: "ios",
  appVersion: "0.8.2",
  timestamp: "2026-08-04T08:00:00.000Z",
  metrics: { durationMs: 4200, operation: "discovery-import" },
};

test("accepts an allowlisted content-free technical event", () => {
  assert.equal(AnonymousAnalyticsEventSchema.safeParse(validEvent).success, true);
});

test("rejects URLs and discovery content even alongside a valid event", () => {
  assert.equal(AnonymousAnalyticsEventSchema.safeParse({
    ...validEvent,
    url: "https://private.example/article",
    title: "Private title",
    summary: "Private summary",
  }).success, false);
});

test("rejects free-form error messages and unknown events", () => {
  assert.equal(AnonymousAnalyticsEventSchema.safeParse({
    ...validEvent,
    event: "PromptSubmitted",
    metrics: { errorMessage: "A personal prompt was included" },
  }).success, false);
});
