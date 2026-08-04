import {
  analyticsErrorKinds,
  analyticsOperations,
  anonymousAnalyticsEvents,
} from "@savewise/shared";
import { z } from "zod";

export const AnonymousAnalyticsEventSchema = z.object({
  anonymousId: z.string().uuid(),
  event: z.enum(anonymousAnalyticsEvents),
  platform: z.enum(["ios", "android", "web", "unknown"]),
  appVersion: z.string().trim().min(1).max(30),
  timestamp: z.string().datetime(),
  metrics: z.object({
    durationMs: z.number().int().min(0).max(86_400_000).optional(),
    itemCount: z.number().int().min(0).max(1_000_000).optional(),
    operation: z.enum(analyticsOperations).optional(),
    errorKind: z.enum(analyticsErrorKinds).optional(),
  }).strict().optional(),
}).strict();

export const AnonymousIdSchema = z.string().uuid();
