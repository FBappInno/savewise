import "dotenv/config";

import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { z } from "zod";
import multer from "multer";

import { FileDiscoveryRepository } from "./repositories/file-discovery-repository";
import {
  buildCurrentKnowledgeLibrary,
  deleteDiscovery,
  getAllDiscoveries,
  getDiscoveriesForInterest,
  getDiscoveryById,
  getDiscoveryByUrl,
  getRelatedDiscoveries,
  rebuildCurrentKnowledgeLibrary,
  saveDiscovery,
  updateDiscovery,
} from "./services/discoveries/discovery-service";


import {
  migrateKnownGalaxyLabelDuplicates,
} from "./services/discoveries/galaxy-label-migration";
import { importContent } from "./services/import/content-import-service";
import {
  selectGalaxyCandidates,
} from "./services/ai/openai-galaxy-candidates";
import {
  fetchPageMetadata,
} from "./utils/metadata-fetcher";
import { updateKnowledgeGraphNode } from "./services/knowledge/knowledge-graph-overrides";

import {
  organizeGalaxies,
} from "./services/ai/openai-galaxy-organizer";

import {
  applyGalaxyOrganization,
} from "./services/knowledge/galaxy-organization-service";
import { ContentFetchError } from "./types/content-fetch-error";
import {
  analyzeSecondBrain,
  answerKnowledgeQuestion,
  generateKnowledgeDocument,
} from "./services/ai/openai-second-brain";
import {
  loadPersonalAssistantProfile,
  rememberKnowledgeQuestion,
  savePersonalAssistantProfile,
} from "./persistence/knowledge/personal-assistant-profile-store";
import {
  getResearchState,
  runPersonalResearch,
  startResearchScheduler,
  isResearchDue,
  updateResearchCandidateStatus,
} from "./services/research/research-service";
import {
  buildPersonalIntelligenceOverview,
  recordLearningCycle,
} from "./services/intelligence/personal-intelligence-service";
import { createPersonalWorkProduct } from "./services/intelligence/personal-work-assistant";
import {
  createPortableSyncBundle,
  mergePortableSyncBundle,
} from "./services/storage/cloud-sync-service";
import type { PortableSyncBundle } from "@savewise/shared";
import type { AnonymousAnalyticsEvent } from "@savewise/shared";
import {
  appendAnonymousAnalyticsEvent,
  deleteAnonymousAnalyticsEvents,
} from "./services/analytics/anonymous-analytics-store";
import {
  AnonymousAnalyticsEventSchema,
  AnonymousIdSchema,
} from "./services/analytics/anonymous-analytics-schema";
import {
  AccountError,
  authenticateAccount,
  changeAccountPassword,
  loginAccount,
  requestAccountEmailChange,
  requestAccountVerification,
  revokeOtherAccountSessions,
  updateAccountUsername,
  verifyAccountEmail,
} from "./services/account/account-service";
import {
  completeDropboxAuthorization,
  createDropboxAuthorizationUrl,
  disconnectDropboxAccount,
  downloadDropboxAttachment,
  downloadDropboxBundle,
  getDropboxStatus,
  uploadDropboxBundle,
} from "./services/cloud/dropbox-oauth-service";
import { runtimeConfig } from "./config/runtime-config";
import {
  captureFile,
} from "./services/capture/file-capture-service";

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Import timed out after ${
            timeoutMs / 1000
          } seconds.`,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise,
  ]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

import {
  previewFileGalaxyCandidates,
} from "./services/capture/file-capture-service";

const app = express();

const port = Number(
  process.env.PORT ?? 3001,
);

const discoveryRepository =
  new FileDiscoveryRepository();


const captureUpload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        25 *
        1024 *
        1024,

      files:
        1,
    },

    fileFilter(
      _request,
      file,
      callback,
    ) {
      const allowed =
        new Set([
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
        ]);

      if (
        allowed.has(
          file.mimetype,
        )
      ) {
        callback(
          null,
          true,
        );

        return;
      }

      callback(
        new Error(
          "UNSUPPORTED_CAPTURE_FILE",
        ),
      );
    },
  });

app.disable("x-powered-by");

app.use(
  cors({
    origin: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Accept",
      "Authorization",
      "Content-Type",
      "X-SaveWise-Installation-Id",
    ],
  }),
);

app.use(
  express.json({
    limit: "5mb",
  }),
);

const WorkspaceIdSchema = z.enum([
  "private",
  "business",
]);

const ImportRequestSchema = z.object({
  workspaceId:
    WorkspaceIdSchema
      .optional()
      .default("private"),
  url: z.string().trim().url(),
  preferredLanguage: z.enum(["de", "en", "fr", "it", "es"]).optional(),
  preferredKnowledgePath: z.array(z.string().trim().min(2).max(60)).min(1).max(3).optional(),
});

const GalaxyCandidatePreviewSchema =
  z.object({
    workspaceId:
      WorkspaceIdSchema
        .optional()
        .default("private"),

    url:
      z.string()
        .trim()
        .url(),
  });


const KnowledgeQuestionSchema = z.object({
  workspaceId:
    WorkspaceIdSchema
      .optional()
      .default("private"),

  question: z
    .string()
    .trim()
    .min(3)
    .max(500),

  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(5000),
  })).max(12).default([]),
});

const KnowledgeDocumentRequestSchema = z.object({
  type: z.enum([
    "summary", "learning-plan", "presentation", "blog-article",
    "checklist", "project-overview",
  ]),
  instruction: z.string().trim().min(3).max(500),
});

const WorkAssistantRequestSchema = z.object({
  type: z.enum([
    "meeting-brief",
    "presentation",
    "project-summary",
    "learning-plan",
    "talk-outline",
    "business-case",
  ]),
  instruction: z.string().trim().min(3).max(1000),
  includeVerifiedResearch: z.boolean().default(false),
});

const ResearchCandidateStatusSchema = z.object({
  status: z.enum(["suggested", "dismissed"]),
});

const AccountVerificationRequestSchema = z.object({
  username: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  oldPassword: z.string().min(1).max(128).optional(),
  newPassword: z.string().min(10).max(128),
}).strict();

const AccountProfileUpdateSchema =
  z.object({
    username:
      z.string()
        .trim()
        .min(2)
        .max(80),
  }).strict();

const AccountPasswordChangeSchema =
  z.object({
    currentPassword:
      z.string()
        .min(1)
        .max(128),

    newPassword:
      z.string()
        .min(10)
        .max(128),
  }).strict();

const AccountEmailChangeSchema =
  z.object({
    currentPassword:
      z.string()
        .min(1)
        .max(128),

    newEmail:
      z.string()
        .trim()
        .email()
        .max(254),
  }).strict();

const AccountLoginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

const SyncDiscoverySchema = z.object({
  id: z.string().trim().min(1).max(200),

  workspaceId:
    WorkspaceIdSchema
      .optional()
      .default("private"),
  source: z.enum(["youtube", "instagram", "tiktok", "web"]),
  url: z.string().url().optional(),
  title: z.string().min(1).max(5_000),
  improvedTitle: z.string().max(5_000).optional(),
  description: z.string().max(100_000).optional(),
  summary: z.string().max(5_000).optional(),
  thumbnailUrl: z.string().url().optional(),
  author: z.string().max(500).optional(),
  publishedAt: z.string().optional(),
  classification: z.object({
    primaryCategory: z.enum([
      "technology", "finance", "business", "science", "health",
      "education", "productivity", "culture", "news", "lifestyle", "other",
    ]),
    secondaryCategory: z.string().trim().min(2).max(60),
    topic: z.string().trim().min(2).max(60),
    subtopics: z.array(z.string().trim().min(2).max(50)).max(6),
  }).optional(),
  keywords: z.array(z.string().max(200)).max(100),
  language: z.string().max(20).optional(),
  confidence: z.number().min(0).max(1).optional(),
  topics: z.array(z.string().max(200)).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  savedAtLabel: z.string().max(100),
});

const PortableSyncBundleSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  sourceInstallationId: z.string().trim().min(1).max(200),
  discoveries: z.array(SyncDiscoverySchema).max(50_000),
  knowledgeGraph: z.unknown().nullable(),
});

const DiscoveryIdSchema = z
  .string()
  .trim()
  .min(1);

const DiscoveryUpdateSchema = z.object({
  title: z.string().trim().min(3).max(120),

  summary: z.string().trim().max(420),

  workspaceId:
    WorkspaceIdSchema,

  language:
    z.enum([
      "de",
      "en",
      "fr",
      "it",
      "es",
    ]).optional(),
  classification: z.object({
    primaryCategory: z.enum([
      "technology", "finance", "business", "science", "health",
      "education", "productivity", "culture", "news", "lifestyle", "other",
    ]),

    mode: z
      .enum(["ai", "manual"])
      .optional()
      .default("ai"),

    secondaryCategory: z.string().trim().min(2).max(60),
    topic: z.string().trim().min(2).max(60),
    subtopics: z.array(z.string().trim().min(2).max(50)).max(6),
  }),
});

const LimitQuerySchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20);

const KnowledgeTopicUpdateSchema = z.object({
  title: z.string().trim().min(2).max(80),
  parentId: z.string().trim().min(1).nullable(),
});

app.get(
  "/health",
  (_request, response) => {
    response.json({
      status: "ok",

      service: "savewise-backend",

      timestamp:
        new Date().toISOString(),
    });
  },
);

app.post("/api/analytics/events", async (request, response) => {
  const parsed = AnonymousAnalyticsEventSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "A valid anonymous analytics event is required." });
    return;
  }

  try {
    await appendAnonymousAnalyticsEvent(parsed.data as AnonymousAnalyticsEvent);
    response.status(204).send();
  } catch {
    response.status(503).json({ error: "Anonymous analytics are temporarily unavailable." });
  }
});

app.delete("/api/analytics/devices/:anonymousId", async (request, response) => {
  const anonymousId = AnonymousIdSchema.safeParse(request.params.anonymousId);
  if (!anonymousId.success) {
    response.status(400).json({ error: "A valid anonymous identifier is required." });
    return;
  }

  try {
    const deletedEvents = await deleteAnonymousAnalyticsEvents(anonymousId.data);
    response.json({ deletedEvents });
  } catch {
    response.status(503).json({ error: "Anonymous analytics deletion is temporarily unavailable." });
  }
});

app.post("/api/account/request-verification", async (request, response) => {
  const parsed = AccountVerificationRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "ACCOUNT_INPUT_INVALID" });
    return;
  }
  try {
    const result = await requestAccountVerification(parsed.data);
    response.status(202).json(result);
  } catch (error) {
    const accountError = error instanceof AccountError ? error : null;
    response.status(accountError?.status ?? 500).json({ error: accountError?.code ?? "ACCOUNT_UPDATE_FAILED" });
  }
});

app.get("/api/account/verify", async (request, response) => {
  const token = z.string().min(20).safeParse(request.query.token);
  if (!token.success) {
    response.status(400).send("Ungültiger Bestätigungslink.");
    return;
  }
  try {
    await verifyAccountEmail(token.data);
    response.redirect("savewise://account-verified");
  } catch {
    response.status(400).send("Der Bestätigungslink ist ungültig oder abgelaufen.");
  }
});

app.post("/api/account/login", async (request, response) => {
  const parsed = AccountLoginSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: "LOGIN_INPUT_INVALID" });
    return;
  }
  try {
    response.json(await loginAccount(parsed.data.email, parsed.data.password));
  } catch (error) {
    const accountError = error instanceof AccountError ? error : null;
    response.status(accountError?.status ?? 500).json({ error: accountError?.code ?? "LOGIN_FAILED" });
  }
});

app.patch(
  "/api/account/profile",
  async (
    request,
    response,
  ) => {
    const authorization =
      request.headers.authorization;

    const token =
      authorization?.startsWith(
        "Bearer ",
      )
        ? authorization.slice(7)
        : "";

    const account =
      token
        ? await authenticateAccount(
            token,
          )
        : null;

    if (!account) {
      response.status(401).json({
        error:
          "SESSION_INVALID",
      });

      return;
    }

    const parsed =
      AccountProfileUpdateSchema
        .safeParse(
          request.body,
        );

    if (!parsed.success) {
      response.status(400).json({
        error:
          "ACCOUNT_INPUT_INVALID",
      });

      return;
    }

    try {
      const updated =
        await updateAccountUsername(
          account.id,
          parsed.data.username,
        );

      response.json({
        account:
          updated,
      });
    } catch (error) {
      const accountError =
        error instanceof
        AccountError
          ? error
          : null;

      response
        .status(
          accountError?.status ??
          500,
        )
        .json({
          error:
            accountError?.code ??
            "ACCOUNT_UPDATE_FAILED",
        });
    }
  },
);

app.post(
  "/api/account/password/change",
  async (
    request,
    response,
  ) => {
    const authorization =
      request.headers.authorization;

    const token =
      authorization?.startsWith(
        "Bearer ",
      )
        ? authorization.slice(7)
        : "";

    const account =
      token
        ? await authenticateAccount(
            token,
          )
        : null;

    if (!account) {
      response.status(401).json({
        error:
          "SESSION_INVALID",
      });

      return;
    }

    const parsed =
      AccountPasswordChangeSchema
        .safeParse(
          request.body,
        );

    if (!parsed.success) {
      response.status(400).json({
        error:
          "PASSWORD_INPUT_INVALID",
      });

      return;
    }

    try {
      const updated =
        await changeAccountPassword(
          account.id,
          token,
          parsed.data
            .currentPassword,
          parsed.data
            .newPassword,
        );

      response.json({
        account:
          updated,
      });
    } catch (error) {
      const accountError =
        error instanceof
        AccountError
          ? error
          : null;

      response
        .status(
          accountError?.status ??
          500,
        )
        .json({
          error:
            accountError?.code ??
            "PASSWORD_CHANGE_FAILED",
        });
    }
  },
);

app.post(
  "/api/account/email/change",
  async (
    request,
    response,
  ) => {
    const authorization =
      request.headers.authorization;

    const token =
      authorization?.startsWith(
        "Bearer ",
      )
        ? authorization.slice(7)
        : "";

    const account =
      token
        ? await authenticateAccount(
            token,
          )
        : null;

    if (!account) {
      response.status(401).json({
        error:
          "SESSION_INVALID",
      });

      return;
    }

    const parsed =
      AccountEmailChangeSchema
        .safeParse(
          request.body,
        );

    if (!parsed.success) {
      response.status(400).json({
        error:
          "ACCOUNT_INPUT_INVALID",
      });

      return;
    }

    try {
      const result =
        await requestAccountEmailChange(
          account.id,
          parsed.data
            .currentPassword,
          parsed.data
            .newEmail,
        );

      response.status(202).json(
        result,
      );
    } catch (error) {
      const accountError =
        error instanceof
        AccountError
          ? error
          : null;

      response
        .status(
          accountError?.status ??
          500,
        )
        .json({
          error:
            accountError?.code ??
            "EMAIL_CHANGE_FAILED",
        });
    }
  },
);

app.post(
  "/api/account/sessions/revoke-others",
  async (
    request,
    response,
  ) => {
    const authorization =
      request.headers.authorization;

    const token =
      authorization?.startsWith(
        "Bearer ",
      )
        ? authorization.slice(7)
        : "";

    const account =
      token
        ? await authenticateAccount(
            token,
          )
        : null;

    if (!account) {
      response.status(401).json({
        error:
          "SESSION_INVALID",
      });

      return;
    }

    try {
      const revoked =
        await revokeOtherAccountSessions(
          account.id,
          token,
        );

      response.json({
        revoked,
      });
    } catch (error) {
      const accountError =
        error instanceof
        AccountError
          ? error
          : null;

      response
        .status(
          accountError?.status ??
          500,
        )
        .json({
          error:
            accountError?.code ??
            "SESSION_REVOKE_FAILED",
        });
    }
  },
);

app.get("/api/account/session", async (request, response) => {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const account = token ? await authenticateAccount(token) : null;
  if (!account) {
    response.status(401).json({ error: "SESSION_INVALID" });
    return;
  }
  response.json({ account: { username: account.username, email: account.email } });
});

app.get(
  "/api/cloud/dropbox/connect",
  async (
    request,
    response,
  ) => {
    const account =
      await authenticateRequestAccount(
        request,
      );

    if (!account) {
      response.status(401).json({
        error:
          "SESSION_INVALID",
      });

      return;
    }

    try {
      response.json({
        authorizationUrl:
          createDropboxAuthorizationUrl(
            account.id,
          ),
      });
    } catch (error) {
      response.status(503).json({
        error:
          error instanceof Error
            ? error.message
            : "DROPBOX_CONNECT_FAILED",
      });
    }
  },
);

app.get(
  "/api/cloud/dropbox/callback",
  async (
    request,
    response,
  ) => {
    const code =
      z.string()
        .min(10)
        .safeParse(
          request.query.code,
        );

    const state =
      z.string()
        .min(20)
        .safeParse(
          request.query.state,
        );

    if (
      !code.success ||
      !state.success
    ) {
      response.redirect(
        `${runtimeConfig.mobileAppUrl}?dropbox=error`,
      );

      return;
    }

    try {
      await completeDropboxAuthorization(
        code.data,
        state.data,
      );

      response.redirect(
        `${runtimeConfig.mobileAppUrl}?dropbox=connected`,
      );
    } catch (error) {
      console.error(
        "Dropbox OAuth callback failed:",
        error,
      );

      response.redirect(
        `${runtimeConfig.mobileAppUrl}?dropbox=error`,
      );
    }
  },
);

app.get(
  "/api/cloud/dropbox/status",
  async (
    request,
    response,
  ) => {
    const account =
      await authenticateRequestAccount(
        request,
      );

    if (!account) {
      response.status(401).json({
        error:
          "SESSION_INVALID",
      });

      return;
    }

    try {
      response.json({
        connection:
          await getDropboxStatus(
            account.id,
          ),
      });
    } catch (error) {
      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "DROPBOX_STATUS_FAILED",
      });
    }
  },
);

app.post(
  "/api/cloud/dropbox/sync",
  async (
    request,
    response,
  ) => {
    const account =
      await authenticateRequestAccount(
        request,
      );

    if (!account) {
      response.status(401).json({
        error:
          "SESSION_INVALID",
      });

      return;
    }

    try {
      const remoteBundle =
        await downloadDropboxBundle(
          account.id,
        );

      const importResult =
        remoteBundle
          ? await mergePortableSyncBundle(
              discoveryRepository,
              remoteBundle,
            )
          : null;

      const localBundle =
        await createPortableSyncBundle(
          discoveryRepository,

          typeof request.headers[
            "x-savewise-installation-id"
          ] === "string"
            ? request.headers[
                "x-savewise-installation-id"
              ]
            : undefined,
        );

      const syncedAt =
        await uploadDropboxBundle(
          account.id,
          localBundle,
        );

      response.json({
        syncedAt,

        uploadedDiscoveries:
          localBundle
            .discoveries.length,

        importResult,
      });
    } catch (error) {
      console.error(
        "Dropbox sync failed:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "DROPBOX_SYNC_FAILED",
      });
    }
  },
);

app.delete(
  "/api/cloud/dropbox",
  async (
    request,
    response,
  ) => {
    const account =
      await authenticateRequestAccount(
        request,
      );

    if (!account) {
      response.status(401).json({
        error:
          "SESSION_INVALID",
      });

      return;
    }

    try {
      await disconnectDropboxAccount(
        account.id,
      );

      response.status(204).send();
    } catch (error) {
      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "DROPBOX_DISCONNECT_FAILED",
      });
    }
  },
);

app.get("/api/storage/sync/export", async (request, response) => {
  try {
    const bundle = await createPortableSyncBundle(
      discoveryRepository,
      typeof request.headers["x-savewise-installation-id"] === "string"
        ? request.headers["x-savewise-installation-id"]
        : undefined,
    );
    response.json({ bundle });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Sync export failed.",
    });
  }
});

app.post("/api/storage/sync/import", async (request, response) => {
  const parsed = PortableSyncBundleSchema.safeParse(request.body?.bundle);
  if (!parsed.success) {
    response.status(400).json({ error: "A valid SaveWise sync bundle is required." });
    return;
  }

  try {
    const result = await mergePortableSyncBundle(
      discoveryRepository,
      parsed.data as PortableSyncBundle,
    );
    response.json({ result });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Sync import failed.",
    });
  }
});

app.get(
  "/api/capture/attachments/:discoveryId",

  async (
    request,
    response,
  ) => {
    const account =
      await authenticateRequestAccount(
        request,
      );

    if (!account) {
      response.status(401).json({
        error:
          "SESSION_INVALID",
      });

      return;
    }

    const discoveryId =
      z.string()
        .trim()
        .min(1)
        .safeParse(
          request.params.discoveryId,
        );

    if (!discoveryId.success) {
      response.status(400).json({
        error:
          "DISCOVERY_ID_INVALID",
      });

      return;
    }

    try {
      const discovery =
        await getDiscoveryById(
          discoveryRepository,
          discoveryId.data,
        );

      if (!discovery) {
        response.status(404).json({
          error:
            "DISCOVERY_NOT_FOUND",
        });

        return;
      }

      if (!discovery.attachment) {
        response.status(404).json({
          error:
            "DISCOVERY_ATTACHMENT_NOT_FOUND",
        });

        return;
      }

      const bytes =
        await downloadDropboxAttachment(
          account.id,
          discovery.attachment.storagePath,
        );

      const safeFileName =
        discovery.attachment.fileName.replace(
          /["\\\r\n]/g,
          "_",
        );

      response.setHeader(
        "Content-Type",
        discovery.attachment.mimeType,
      );

      response.setHeader(
        "Content-Length",
        String(bytes.byteLength),
      );

      response.setHeader(
        "Content-Disposition",
        `inline; filename*=UTF-8''${encodeURIComponent(
          safeFileName,
        )}`,
      );

      response.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0",
      );

      response.status(200).send(
        bytes,
      );
    } catch (error) {
      console.error(
        "Attachment download failed:",
        error,
      );

      response.status(502).json({
        error:
          error instanceof Error
            ? error.message
            : "DISCOVERY_ATTACHMENT_DOWNLOAD_FAILED",
      });
    }
  },
);

app.post(
  "/api/capture/file/candidates",

  captureUpload.single(
    "file",
  ),

  async (
    request,
    response,
  ) => {
    const account =
      await authenticateRequestAccount(
        request,
      );

    if (!account) {
      response.status(
        401,
      ).json({
        error:
          "SESSION_INVALID",
      });

      return;
    }

    if (!request.file) {
      response.status(
        400,
      ).json({
        error:
          "CAPTURE_FILE_REQUIRED",
      });

      return;
    }

    const fields =
      z.object({
        workspaceId:
          WorkspaceIdSchema
            .optional()
            .default(
              "private",
            ),

        captureType:
          z.enum([
            "pdf",
            "image",
          ]),

        preferredLanguage:
          z.enum([
            "de",
            "en",
            "fr",
            "it",
            "es",
          ])
            .optional()
            .default(
              "de",
            ),
      })
        .safeParse(
          request.body,
        );

    if (!fields.success) {
      response.status(
        400,
      ).json({
        error:
          "CAPTURE_INPUT_INVALID",

        details:
          fields.error.flatten(),
      });

      return;
    }

    const expectedType =
      fields.data
        .captureType ===
      "pdf"
        ? request.file
            .mimetype ===
          "application/pdf"
        : request.file
            .mimetype
            .startsWith(
              "image/",
            );

    if (!expectedType) {
      response.status(
        400,
      ).json({
        error:
          "CAPTURE_TYPE_MISMATCH",
      });

      return;
    }

    try {
      const candidates =
        await withTimeout(
          previewFileGalaxyCandidates(
            discoveryRepository,
            {
              workspaceId:
                fields.data
                  .workspaceId,

              captureType:
                fields.data
                  .captureType,

              preferredLanguage:
                fields.data
                  .preferredLanguage,

              file: {
                originalName:
                  request.file
                    .originalname,

                mimeType:
                  request.file
                    .mimetype,

                sizeBytes:
                  request.file
                    .size,

                bytes:
                  request.file
                    .buffer,
              },
            },
          ),
          120_000,
        );

      response.json({
        candidates,
      });
    } catch (error) {
      console.error(
        "File Galaxy candidate preview failed:",
        error,
      );

      response.status(
        500,
      ).json({
        error:
          error instanceof Error
            ? error.message
            : "FILE_GALAXY_CANDIDATE_PREVIEW_FAILED",
      });
    }
  },
);


app.post(
  "/api/capture/file",

  captureUpload.single(
    "file",
  ),

  async (
    request,
    response,
  ) => {
    const account =
      await authenticateRequestAccount(
        request,
      );

    if (!account) {
      response.status(401).json({
        error:
          "SESSION_INVALID",
      });

      return;
    }

    if (!request.file) {
      response.status(400).json({
        error:
          "CAPTURE_FILE_REQUIRED",
      });

      return;
    }

    const fields =
      z.object({
        workspaceId:
          WorkspaceIdSchema
            .optional()
            .default("private"),

        captureType:
          z.enum([
            "pdf",
            "image",
          ]),

        preferredLanguage:
          z.enum([
            "de",
            "en",
            "fr",
            "it",
            "es",
          ])
            .optional()
            .default("de"),

        preferredKnowledgePath:
          z.string()
            .optional(),
      })
        .safeParse(
          request.body,
        );

    if (!fields.success) {
      response.status(400).json({
        error:
          "CAPTURE_INPUT_INVALID",

        details:
          fields.error.flatten(),
      });

      return;
    }

    const expectedType =
      fields.data
        .captureType ===
      "pdf"
        ? request.file
            .mimetype ===
          "application/pdf"
        : request.file
            .mimetype
            .startsWith(
              "image/",
            );

    if (!expectedType) {
      response.status(400).json({
        error:
          "CAPTURE_TYPE_MISMATCH",
      });

      return;
    }

    let preferredKnowledgePath:
      string[] | undefined;

    if (
      fields.data
        .preferredKnowledgePath
    ) {
      try {
        const parsed:
          unknown =
          JSON.parse(
            fields.data
              .preferredKnowledgePath,
          );

        if (
          Array.isArray(
            parsed,
          )
        ) {
          preferredKnowledgePath =
            parsed
              .filter(
                (
                  value,
                ): value is string =>
                  typeof value ===
                    "string",
              )
              .map(
                (value) =>
                  value.trim(),
              )
              .filter(Boolean)
              .slice(0, 3);
        }
      } catch {
        response.status(400).json({
          error:
            "CAPTURE_KNOWLEDGE_PATH_INVALID",
        });

        return;
      }
    }

    try {
      const result =
        await withTimeout(
          captureFile(
            discoveryRepository,
            {
              saveWiseAccountId:
                account.id,

              workspaceId:
                fields.data
                  .workspaceId,

              captureType:
                fields.data
                  .captureType,

              preferredLanguage:
                fields.data
                  .preferredLanguage,

              preferredKnowledgePath,

              file: {
                originalName:
                  request.file
                    .originalname,

                mimeType:
                  request.file
                    .mimetype,

                sizeBytes:
                  request.file
                    .size,

                bytes:
                  request.file
                    .buffer,
              },
            },
          ),
          120_000,
        );

      response.status(201).json(
        result,
      );
    } catch (error) {
      console.error(
        "File capture failed:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "FILE_CAPTURE_FAILED";

      const status =
        message ===
          "PDF_HAS_NO_EXTRACTABLE_TEXT"
          ? 422
          : message ===
              "DROPBOX_NOT_CONNECTED"
            ? 409
            : 500;

      response.status(status).json({
        error:
          message,
      });
    }
  },
);


async function buildGalaxyCandidatePaths(
  workspaceId:
    "private" | "business",
) {
  const workspaceDiscoveries =
    (
      await getAllDiscoveries(
        discoveryRepository,
      )
    ).filter(
      (discovery) =>
        (
          discovery.workspaceId ??
          "private"
        ) ===
        workspaceId,
    );

  const galaxyMap =
    new Map<
      string,
      {
        count: number;
        planets:
          Map<
            string,
            number
          >;
      }
    >();

  for (
    const discovery of
    workspaceDiscoveries
  ) {
    const classification =
      discovery.classification;

    if (!classification) {
      continue;
    }

    const galaxy =
      classification
        .secondaryCategory
        ?.trim();

    const planet =
      classification
        .topic
        ?.trim();

    if (!galaxy) {
      continue;
    }

    const current =
      galaxyMap.get(
        galaxy,
      ) ?? {
        count: 0,

        planets:
          new Map<
            string,
            number
          >(),
      };

    current.count += 1;

    if (planet) {
      current.planets.set(
        planet,
        (
          current.planets.get(
            planet,
          ) ??
          0
        ) + 1,
      );
    }

    galaxyMap.set(
      galaxy,
      current,
    );
  }

  return [
    ...galaxyMap.entries(),
  ]
    .sort(
      (
        [, left],
        [, right],
      ) =>
        right.count -
        left.count,
    )
    .slice(
      0,
      50,
    )
    .map(
      ([
        galaxy,
        data,
      ]) => ({
        galaxy,

        planets:
          [
            ...data.planets
              .entries(),
          ]
            .sort(
              (
                [, left],
                [, right],
              ) =>
                right -
                left,
            )
            .slice(
              0,
              12,
            )
            .map(
              ([planet]) =>
                planet,
            ),
      }),
    );
}

app.post(
  "/api/import/candidates",
  async (
    request,
    response,
  ) => {
    const parsed =
      GalaxyCandidatePreviewSchema
        .safeParse(
          request.body,
        );

    if (!parsed.success) {
      response.status(
        400,
      ).json({
        error:
          "A valid URL is required.",
      });

      return;
    }

    try {
      const [
        metadata,
        existingKnowledgePaths,
      ] =
        await Promise.all([
          fetchPageMetadata(
            parsed.data.url,
          ),

          buildGalaxyCandidatePaths(
            parsed.data.workspaceId,
          ),
        ]);

      const candidates =
        await withTimeout(
          selectGalaxyCandidates(
            metadata,
            existingKnowledgePaths,
          ),
          40_000,
        );

      response.json({
        candidates,
      });
    } catch (error) {
      console.error(
        "Galaxy candidate preview failed:",
        error,
      );

      response.status(
        500,
      ).json({
        error:
          error instanceof Error
            ? error.message
            : "GALAXY_CANDIDATE_PREVIEW_FAILED",
      });
    }
  },
);

app.post(
  "/api/import",
  async (request, response) => {
    const parsedRequest =
      ImportRequestSchema.safeParse(
        request.body,
      );

    if (!parsedRequest.success) {
      response.status(400).json({
        error:
          "A valid URL is required.",

        details:
          parsedRequest.error.flatten(),
      });

      return;
    }

    try {
      const duplicateDiscovery =
        await getDiscoveryByUrl(
          discoveryRepository,
          parsedRequest.data.url,
          parsedRequest.data.workspaceId,
        );
      if (duplicateDiscovery) {
        response.status(409).json({
          code: "duplicate_discovery",
          error: duplicateDiscoveryMessage(
            parsedRequest.data.preferredLanguage,
            duplicateDiscovery.improvedTitle || duplicateDiscovery.title,
          ),
          discoveryId: duplicateDiscovery.id,
        });
        return;
      }

      const workspaceDiscoveries =
        (
          await getAllDiscoveries(
            discoveryRepository,
          )
        ).filter(
          (discovery) =>
            (
              discovery.workspaceId ??
              "private"
            ) ===
            parsedRequest.data
              .workspaceId,
        );

      const galaxyMap =
        new Map<
          string,
          {
            count: number;
            planets:
              Map<
                string,
                number
              >;
          }
        >();

      for (
        const discovery of
        workspaceDiscoveries
      ) {
        const classification =
          discovery.classification;

        if (!classification) {
          continue;
        }

        const galaxy =
          classification
            .secondaryCategory
            ?.trim();

        const planet =
          classification
            .topic
            ?.trim();

        if (!galaxy) {
          continue;
        }

        const current =
          galaxyMap.get(
            galaxy,
          ) ?? {
            count:
              0,

            planets:
              new Map<
                string,
                number
              >(),
          };

        current.count += 1;

        if (planet) {
          current.planets.set(
            planet,
            (
              current.planets.get(
                planet,
              ) ??
              0
            ) + 1,
          );
        }

        galaxyMap.set(
          galaxy,
          current,
        );
      }

      const existingKnowledgePaths =
        [
          ...galaxyMap.entries(),
        ]
          .sort(
            (
              [, left],
              [, right],
            ) =>
              right.count -
              left.count,
          )
          .slice(0, 50)
          .map(
            ([
              galaxy,
              data,
            ]) => ({
              galaxy,

              planets:
                [
                  ...data.planets
                    .entries(),
                ]
                  .sort(
                    (
                      [, left],
                      [, right],
                    ) =>
                      right -
                      left,
                  )
                  .slice(0, 6)
                  .map(
                    ([planet]) =>
                      planet,
                  ),
            }),
          );

      const preferredGalaxy =
        parsedRequest.data
          .preferredKnowledgePath
          ?.[0]
          ?.trim();

      const effectiveKnowledgePaths =
        preferredGalaxy
          ? existingKnowledgePaths
              .filter(
                (path) =>
                  path.galaxy
                    .toLocaleLowerCase() ===
                  preferredGalaxy
                    .toLocaleLowerCase(),
              )
          : existingKnowledgePaths;

      const importResult =
        await withTimeout(
          importContent(
            parsedRequest.data.url,
            {
              preferredLanguage:
                parsedRequest.data.preferredLanguage,
              preferredKnowledgePath:
                parsedRequest.data.preferredKnowledgePath,

              existingKnowledgePaths:
                effectiveKnowledgePaths,
            },
          ),
          90_000,
        );

      /*
       * CLASSIFICATION V3B
       *
       * Wenn der Benutzer vor dem Import eine
       * bestehende Galaxie ausgewählt hat, ist
       * diese Entscheidung verbindlich.
       *
       * Die KI darf weiterhin den passenden
       * Planeten innerhalb dieser Galaxie
       * wiederverwenden oder dort einen neuen
       * Planeten erzeugen.
       *
       * Sie darf die ausgewählte Galaxie aber
       * nicht durch einen neuen/ähnlichen Namen
       * ersetzen.
       */
      const lockedGalaxy =
        preferredGalaxy
          ? effectiveKnowledgePaths[0]
              ?.galaxy
          : undefined;

      const finalImportDiscovery =
        lockedGalaxy &&
        importResult.discovery
          .classification
          ? {
              ...importResult.discovery,

              classification: {
                ...importResult.discovery
                  .classification,

                secondaryCategory:
                  lockedGalaxy,
              },
            }
          : importResult.discovery;

      if (lockedGalaxy) {
        console.log(
          "[Classification V3B]",
          JSON.stringify({
            mode:
              "user-galaxy-lock",

            galaxy:
              lockedGalaxy,

            planet:
              finalImportDiscovery
                .classification
                ?.topic ??
              null,

            availablePlanets:
              effectiveKnowledgePaths[0]
                ?.planets
                .length ??
              0,
          }),
        );
      }

      const workspaceDiscovery = {
        ...finalImportDiscovery,

        workspaceId:
          parsedRequest.data
            .workspaceId,
      };

      const storedDiscovery =
        await saveDiscovery(
          discoveryRepository,
          workspaceDiscovery,
        );

      const library =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
          parsedRequest.data.workspaceId,
        );

      if (library.graph) {
        await recordLearningCycle(
          library.graph,
          "discovery-added",
          storedDiscovery.id,
        );
      }

      response.status(201).json({
        ...importResult,

        discovery: storedDiscovery,

        knowledgeUpdate: {
          generatedAt:
            library.generatedAt,

          totalDiscoveries:
            library.discoveries.length,

          totalTopics:
            library.topics.length,

          totalInterests:
            library.interests.length,

          totalRelations:
            library.relations.length,

          graphGeneratedAt:
            library.graph?.generatedAt ??
            null,

          totalGraphNodes:
            library.graph?.nodes.length ??
            0,

          totalGraphRelations:
            library.graph?.relations
              .length ?? 0,
        },
      });
    } catch (error) {
      console.error(
        "Content import failed:",
        error,
      );

      response.status(contentImportStatus(error)).json({
        error:
          error instanceof Error
            ? error.message
            : "Content import failed.",
        ...(
          error instanceof ContentFetchError
            ? { code: error.code }
            : {}
        ),
      });
    }
  },
);

function duplicateDiscoveryMessage(
  language: "de" | "en" | "fr" | "it" | "es" | undefined,
  title: string,
): string {
  const messages = {
    de: `Dieser Beitrag ist bereits gespeichert: ${title}`,
    en: `This entry is already saved: ${title}`,
    fr: `Ce contenu est déjà enregistré : ${title}`,
    it: `Questo contenuto è già salvato: ${title}`,
    es: `Este contenido ya está guardado: ${title}`,
  };
  return messages[language ?? "en"];
}

function contentImportStatus(error: unknown): number {
  if (!(error instanceof ContentFetchError)) return 500;
  switch (error.code) {
    case "invalid_url":
      return 400;
    case "authentication_required":
    case "access_denied":
      return 422;
    case "rate_limited":
      return 429;
    case "content_too_large":
      return 413;
    case "unsupported_content":
    case "empty_content":
      return 422;
    case "timeout":
    case "network_error":
    case "upstream_error":
      return 502;
  }
}

app.get(
  "/api/discoveries",
  async (_request, response) => {
    try {
      const discoveries =
        await getAllDiscoveries(
          discoveryRepository,
        );

      response.json({
        discoveries,
      });
    } catch (error) {
      console.error(
        "Discoveries could not be loaded:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Discoveries could not be loaded.",
      });
    }
  },
);

app.get(
  "/api/discoveries/:discoveryId",
  async (request, response) => {
    const parsedDiscoveryId =
      DiscoveryIdSchema.safeParse(
        request.params.discoveryId,
      );

    if (!parsedDiscoveryId.success) {
      response.status(400).json({
        error:
          "A valid discovery ID is required.",
      });

      return;
    }

    try {
      const discovery =
        await getDiscoveryById(
          discoveryRepository,
          parsedDiscoveryId.data,
        );

      if (!discovery) {
        response.status(404).json({
          error:
            "Discovery not found.",
        });

        return;
      }

      response.json({
        discovery,
      });
    } catch (error) {
      console.error(
        "Discovery could not be loaded:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Discovery could not be loaded.",
      });
    }
  },
);

app.patch(
  "/api/discoveries/:discoveryId",
  async (request, response) => {
    const parsedId = DiscoveryIdSchema.safeParse(request.params.discoveryId);
    const parsedUpdate = DiscoveryUpdateSchema.safeParse(request.body);
    if (!parsedId.success || !parsedUpdate.success) {
      response.status(400).json({
        error: "Valid discovery changes are required.",
        details: parsedUpdate.success ? undefined : parsedUpdate.error.flatten(),
      });
      return;
    }

    try {
      /*
       * Vorherigen Workspace merken.
       *
       * Falls eine Discovery von Privat nach Geschäftlich
       * oder umgekehrt verschoben wird, müssen anschließend
       * beide Knowledge Libraries aktualisiert werden.
       */
      const previousDiscovery =
        await getDiscoveryById(
          discoveryRepository,
          parsedId.data,
        );

      const discovery =
        await updateDiscovery(
          discoveryRepository,
          parsedId.data,
          parsedUpdate.data,
        );

      if (!discovery) {
        response.status(404).json({
          error:
            "Discovery not found.",
        });

        return;
      }

      /*
       * WICHTIG:
       * Die Discovery ist jetzt bereits persistent gespeichert.
       *
       * Deshalb antworten wir sofort an Web / Mobile.
       * Der Benutzer muss nicht auf den kompletten
       * Knowledge-Graph-Rebuild warten.
       */
      response.json({
        discovery,

        knowledgeUpdate: {
          status:
            "queued",
        },
      });

      /*
       * Knowledge-Nacharbeit läuft anschließend
       * unabhängig von der HTTP-Antwort.
       */
      const affectedWorkspaceIds =
        new Set([
          previousDiscovery
            ?.workspaceId ??
            "private",

          discovery.workspaceId ??
            "private",
        ]);

      void Promise.all(
        [...affectedWorkspaceIds].map(
          async (
            workspaceId,
          ) => {
            const library =
              await rebuildCurrentKnowledgeLibrary(
                discoveryRepository,
                workspaceId,
              );

            if (library.graph) {
              await recordLearningCycle(
                library.graph,
                "discovery-updated",
                discovery.id,
              );
            }
          },
        ),
      ).catch((backgroundError) => {
        console.error(
          "Background knowledge update after discovery edit failed:",
          backgroundError,
        );
      });
    } catch (error) {
      console.error("Discovery could not be updated:", error);
      response.status(500).json({
        error: error instanceof Error
          ? error.message
          : "Discovery could not be updated.",
      });
    }
  },
);

app.delete(
  "/api/discoveries/:discoveryId",
  async (request, response) => {
    const parsedDiscoveryId =
      DiscoveryIdSchema.safeParse(
        request.params.discoveryId,
      );

    if (!parsedDiscoveryId.success) {
      response.status(400).json({
        error:
          "A valid discovery ID is required.",
      });

      return;
    }

    try {
      const deleted =
        await deleteDiscovery(
          discoveryRepository,
          parsedDiscoveryId.data,
        );

      if (!deleted) {
        response.status(404).json({
          error:
            "Discovery not found.",
        });

        return;
      }

      const library = await buildCurrentKnowledgeLibrary(discoveryRepository);
      if (library.graph) {
        await recordLearningCycle(
          library.graph,
          "discovery-deleted",
          parsedDiscoveryId.data,
        );
      }

      response.status(204).send();
    } catch (error) {
      console.error(
        "Discovery could not be deleted:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Discovery could not be deleted.",
      });
    }
  },
);

app.get(
  "/api/knowledge",
  async (request, response) => {
    const parsedWorkspace =
      WorkspaceIdSchema.safeParse(
        request.query.workspace ??
          "private",
      );

    if (!parsedWorkspace.success) {
      response.status(400).json({
        error:
          "A valid workspace is required.",
      });

      return;
    }

    try {
      const library =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
          parsedWorkspace.data,
        );

      response.json(library);
    } catch (error) {
      console.error(
        "Knowledge library could not be loaded:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Knowledge library could not be loaded.",
      });
    }
  },
);

app.get(
  "/api/knowledge/graph",
  async (request, response) => {
    const parsedWorkspace =
      WorkspaceIdSchema.safeParse(
        request.query.workspace ??
          "private",
      );

    if (!parsedWorkspace.success) {
      response.status(400).json({
        error:
          "A valid workspace is required.",
      });

      return;
    }

    try {
      const library =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
          parsedWorkspace.data,
        );

      if (!library.graph) {
        response.status(503).json({
          error:
            "The AI knowledge graph is currently unavailable.",
        });

        return;
      }

      response.json({
        graph: library.graph,
      });
    } catch (error) {
      console.error(
        "Knowledge graph could not be loaded:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Knowledge graph could not be loaded.",
      });
    }
  },
);

app.post(
  "/api/knowledge/rebuild",
  async (request, response) => {
    const parsedWorkspace =
      WorkspaceIdSchema.safeParse(
        request.body?.workspaceId ??
        "private",
      );

    if (!parsedWorkspace.success) {
      response.status(400).json({
        error:
          "A valid workspace is required.",
      });

      return;
    }

    try {
      /*
       * SCHRITT 1
       *
       * Aktuellen Stand laden.
       * Kein vollständiger KI-Rebuild.
       */
      const currentLibrary =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
          parsedWorkspace.data,
        );

      /*
       * SCHRITT 2
       *
       * Kleine spezialisierte KI analysiert
       * ausschließlich die Galaxienebene.
       */
      const organization =
        await withTimeout(
          organizeGalaxies(
            currentLibrary.discoveries,
          ),
          65_000,
        );

      /*
       * SCHRITT 3
       *
       * MERGE / GROUP werden direkt auf
       * die Discoveries angewendet.
       */
      const organizationResult =
        await applyGalaxyOrganization(
          discoveryRepository,
          parsedWorkspace.data,
          organization.assignments,
        );

      /*
       * SCHRITT 4
       *
       * Genau EIN vollständiger
       * Knowledge-Graph-Rebuild auf Basis
       * der bereits bereinigten Struktur.
       */
      const library =
        await rebuildCurrentKnowledgeLibrary(
          discoveryRepository,
          parsedWorkspace.data,
        );

      response.json({
        message:
          "Knowledge universe synchronized successfully.",

        organization: {
          summary:
            organization.summary,

          previousGalaxyCount:
            new Set(
              currentLibrary.discoveries
                .map(
                  (discovery) =>
                    discovery.classification
                      ?.secondaryCategory
                      ?.trim(),
                )
                .filter(Boolean),
            ).size,

          currentGalaxyCount:
            new Set(
              library.discoveries
                .map(
                  (discovery) =>
                    discovery.classification
                      ?.secondaryCategory
                      ?.trim(),
                )
                .filter(Boolean),
            ).size,

          ...organizationResult,
        },

        library,
      });
    } catch (error) {
      console.error(
        "Knowledge universe synchronization failed:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Knowledge universe synchronization failed.",
      });
    }
  },
);

app.patch(
  "/api/knowledge/topics/:nodeId",
  async (request, response) => {
    const parsedNodeId = z.string().trim().min(1).safeParse(request.params.nodeId);
    const parsedUpdate = KnowledgeTopicUpdateSchema.safeParse(request.body);
    if (!parsedNodeId.success || !parsedUpdate.success) {
      response.status(400).json({ error: "Valid topic changes are required." });
      return;
    }

    try {
      const library = await buildCurrentKnowledgeLibrary(discoveryRepository);
      if (!library.graph) {
        response.status(503).json({ error: "Knowledge graph unavailable." });
        return;
      }

      const graph = await updateKnowledgeGraphNode(
        library.discoveries,
        library.graph,
        parsedNodeId.data,
        parsedUpdate.data,
      );
      response.json({ graph });
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Topic could not be updated.",
      });
    }
  },
);

app.post(
  "/api/knowledge/graph/rebuild",
  async (_request, response) => {
    try {
      const library =
        await rebuildCurrentKnowledgeLibrary(
          discoveryRepository,
        );

      if (!library.graph) {
        response.status(503).json({
          error:
            "The AI knowledge graph could not be generated.",
        });

        return;
      }

      response.json({
        message:
          "AI knowledge graph rebuilt successfully.",

        graph: library.graph,
      });
    } catch (error) {
      console.error(
        "Knowledge graph rebuild failed:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Knowledge graph rebuild failed.",
      });
    }
  },
);

app.get(
  "/api/knowledge/interests",
  async (request, response) => {
    const parsedLimit =
      LimitQuerySchema.safeParse(
        request.query.limit,
      );

    if (!parsedLimit.success) {
      response.status(400).json({
        error:
          "The limit must be a number between 1 and 100.",
      });

      return;
    }

    try {
      const library =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
        );

      response.json({
        generatedAt:
          library.generatedAt,

        interests:
          library.interests.slice(
            0,
            parsedLimit.data,
          ),
      });
    } catch (error) {
      console.error(
        "Interests could not be loaded:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Interests could not be loaded.",
      });
    }
  },
);

app.get(
  "/api/knowledge/interests/:interestId/discoveries",
  async (request, response) => {
    const parsedLimit =
      LimitQuerySchema.safeParse(
        request.query.limit ?? 50,
      );

    if (!parsedLimit.success) {
      response.status(400).json({
        error:
          "The limit must be a number between 1 and 100.",
      });

      return;
    }

    const interestId =
      request.params.interestId.trim();

    if (!interestId) {
      response.status(400).json({
        error:
          "An interest ID is required.",
      });

      return;
    }

    try {
      const library =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
        );

      const graphNode =
        library.graph?.nodes.find(
          (node) =>
            node.id === interestId ||
            node.title
              .trim()
              .toLocaleLowerCase() ===
              interestId
                .trim()
                .toLocaleLowerCase(),
        );

      const interest =
        library.interests.find(
          (item) =>
            item.id === interestId,
        );

      if (!interest && !graphNode) {
        response.status(404).json({
          error:
            "Interest or graph node not found.",
        });

        return;
      }

      const discoveries =
        await getDiscoveriesForInterest(
          discoveryRepository,
          interestId,
          parsedLimit.data,
        );

      response.json({
        interest:
          interest ?? null,

        graphNode:
          graphNode ?? null,

        discoveries,
      });
    } catch (error) {
      console.error(
        "Interest discoveries could not be loaded:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Interest discoveries could not be loaded.",
      });
    }
  },
);

app.get(
  "/api/knowledge/related/:discoveryId",
  async (request, response) => {
    const parsedDiscoveryId =
      DiscoveryIdSchema.safeParse(
        request.params.discoveryId,
      );

    const parsedLimit =
      LimitQuerySchema.safeParse(
        request.query.limit ?? 5,
      );

    if (
      !parsedDiscoveryId.success ||
      !parsedLimit.success
    ) {
      response.status(400).json({
        error:
          "A valid discovery ID and limit are required.",
      });

      return;
    }

    try {
      const related =
        await getRelatedDiscoveries(
          discoveryRepository,
          parsedDiscoveryId.data,
          Math.min(
            parsedLimit.data,
            20,
          ),
        );

      response.json({
        discoveryId:
          parsedDiscoveryId.data,

        related,
      });
    } catch (error) {
      console.error(
        "Related discoveries could not be loaded:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Related discoveries could not be loaded.",
      });
    }
  },
);

app.get(
  "/api/knowledge/topics",
  async (_request, response) => {
    try {
      const library =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
        );

      response.json({
        generatedAt:
          library.generatedAt,

        topics: library.topics,

        graphNodes:
          library.graph?.nodes ?? [],
      });
    } catch (error) {
      console.error(
        "Topics could not be loaded:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Topics could not be loaded.",
      });
    }
  },
);

app.post(
  "/api/knowledge/ask",
  async (request, response) => {
    const parsedRequest =
      KnowledgeQuestionSchema.safeParse(
        request.body,
      );

    if (!parsedRequest.success) {
      response.status(400).json({
        error:
          "A question between 3 and 500 characters is required.",
        details:
          parsedRequest.error.flatten(),
      });

      return;
    }

    try {
      const library =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
          parsedRequest.data.workspaceId,
        );

      if (!library.graph) {
        response.status(503).json({
          error:
            "The AI knowledge graph is currently unavailable.",
        });

        return;
      }

      const answer = await withTimeout(
        answerKnowledgeQuestion(
          parsedRequest.data.question,
          library.discoveries,
          library.graph,
          parsedRequest.data.history,
          await loadPersonalAssistantProfile(),
        ),
        100_000,
      );

      await rememberKnowledgeQuestion(parsedRequest.data.question);

      response.json(answer);
    } catch (error) {
      console.error(
        "Knowledge question failed:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "The knowledge question could not be answered.",
      });
    }
  },
);

app.get(
  "/api/knowledge/second-brain",
  async (_request, response) => {
    try {
      const library =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
        );

      if (!library.graph) {
        response.status(503).json({
          error:
            "The AI knowledge graph is currently unavailable.",
        });

        return;
      }

      const overview = await withTimeout(
        analyzeSecondBrain(
          library.discoveries,
          library.graph,
          await loadPersonalAssistantProfile(),
        ),
        100_000,
      );

      await savePersonalAssistantProfile(overview.profile);

      response.json(overview);
    } catch (error) {
      console.error(
        "Second Brain analysis failed:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "The Second Brain analysis could not be generated.",
      });
    }
  },
);

app.post(
  "/api/knowledge/documents",
  async (request, response) => {
    const parsedRequest = KnowledgeDocumentRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({ error: "A valid document type and instruction are required." });
      return;
    }

    try {
      const library = await buildCurrentKnowledgeLibrary(discoveryRepository);
      if (!library.graph) {
        response.status(503).json({ error: "The AI knowledge graph is currently unavailable." });
        return;
      }

      const document = await withTimeout(
        generateKnowledgeDocument(
          parsedRequest.data.type,
          parsedRequest.data.instruction,
          library.discoveries,
          library.graph,
          await loadPersonalAssistantProfile(),
        ),
        110_000,
      );
      response.status(201).json(document);
    } catch (error) {
      response.status(500).json({
        error: error instanceof Error ? error.message : "Knowledge document could not be generated.",
      });
    }
  },
);

app.get(
  "/api/intelligence",
  async (_request, response) => {
    try {
      const library = await buildCurrentKnowledgeLibrary(discoveryRepository);
      if (!library.graph) {
        response.status(503).json({ error: "The AI knowledge graph is currently unavailable." });
        return;
      }
      response.json(await buildPersonalIntelligenceOverview(
        library.graph,
        await getResearchState(),
        await loadPersonalAssistantProfile(),
      ));
    } catch (error) {
      response.status(500).json({
        error: error instanceof Error ? error.message : "Personal intelligence could not be generated.",
      });
    }
  },
);

app.post(
  "/api/intelligence/work",
  async (request, response) => {
    const parsedRequest = WorkAssistantRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      response.status(400).json({ error: "A valid work task and instruction are required." });
      return;
    }
    try {
      const library = await buildCurrentKnowledgeLibrary(discoveryRepository);
      if (!library.graph) {
        response.status(503).json({ error: "The AI knowledge graph is currently unavailable." });
        return;
      }
      const research = await getResearchState();
      const result = await withTimeout(createPersonalWorkProduct(
        parsedRequest.data,
        library.discoveries,
        library.graph,
        await loadPersonalAssistantProfile(),
        research.candidates,
      ), 105_000);
      response.status(201).json(result);
    } catch (error) {
      response.status(500).json({
        error: error instanceof Error ? error.message : "The work product could not be generated.",
      });
    }
  },
);

app.get(
  "/api/research",
  async (_request, response) => {
    try {
      response.json(await getResearchState());
    } catch (error) {
      console.error("Research state could not be loaded:", error);
      response.status(500).json({
        error: error instanceof Error
          ? error.message
          : "Research state could not be loaded.",
      });
    }
  },
);

app.post(
  "/api/research/run",
  async (_request, response) => {
    try {
      const library = await buildCurrentKnowledgeLibrary(
        discoveryRepository,
      );

      if (!library.graph) {
        response.status(503).json({
          error: "The AI knowledge graph is currently unavailable.",
        });
        return;
      }

      const research = await withTimeout(
        runPersonalResearch(library.discoveries, library.graph),
        140_000,
      );

      await recordLearningCycle(
        library.graph,
        "research-completed",
      );

      response.json(research);
    } catch (error) {
      console.error("Personal research failed:", error);
      response.status(500).json({
        error: error instanceof Error
          ? error.message
          : "Personal research could not be completed.",
      });
    }
  },
);

app.patch(
  "/api/research/candidates/:candidateId",
  async (request, response) => {
    const parsedRequest = ResearchCandidateStatusSchema.safeParse(
      request.body,
    );

    if (!parsedRequest.success || !request.params.candidateId.trim()) {
      response.status(400).json({
        error: "A candidate ID and valid status are required.",
      });
      return;
    }

    try {
      const research = await updateResearchCandidateStatus(
        request.params.candidateId,
        parsedRequest.data.status,
      );

      if (!research) {
        response.status(404).json({ error: "Research candidate not found." });
        return;
      }

      response.json(research);
    } catch (error) {
      console.error("Research candidate could not be updated:", error);
      response.status(500).json({
        error: error instanceof Error
          ? error.message
          : "Research candidate could not be updated.",
      });
    }
  },
);

app.post(
  "/api/research/candidates/:candidateId/save",
  async (request, response) => {
    try {
      const research = await getResearchState();
      const candidate = research.candidates.find(
        (item) => item.id === request.params.candidateId,
      );

      if (!candidate) {
        response.status(404).json({ error: "Research candidate not found." });
        return;
      }

      const imported = await withTimeout(
        importContent(candidate.url),
        90_000,
      );
      const discovery = await saveDiscovery(
        discoveryRepository,
        imported.discovery,
      );
      const library = await buildCurrentKnowledgeLibrary(discoveryRepository);
      if (library.graph) {
        await recordLearningCycle(
          library.graph,
          "discovery-added",
          discovery.id,
        );
      }
      const updatedResearch = await updateResearchCandidateStatus(
        candidate.id,
        "saved",
      );

      response.status(201).json({
        discovery,
        research: updatedResearch,
      });
    } catch (error) {
      console.error("Research candidate import failed:", error);
      response.status(500).json({
        error: error instanceof Error
          ? error.message
          : "Research candidate could not be saved.",
      });
    }
  },
);

app.use(
  "/api",
  (request, response) => {
    response.status(404).json({
      error:
        "API route not found.",

      method: request.method,

      path: request.originalUrl,
    });
  },
);

app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    console.error(
      "Unhandled server error:",
      error,
    );

    if (response.headersSent) {
      return;
    }

    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Internal server error.",
    });
  },
);

async function authenticateRequestAccount(
  request: Request,
) {
  const authorization =
    request.headers.authorization;

  const token =
    authorization?.startsWith(
      "Bearer ",
    )
      ? authorization.slice(7)
      : "";

  return token
    ? authenticateAccount(
        token,
      )
    : null;
}

async function runStartupMigrations() {
  try {
    await migrateKnownGalaxyLabelDuplicates(
      discoveryRepository,
      "private",
    );
  } catch (error) {
    console.error(
      "[Startup Migration] failed:",
      error,
    );

    /*
     * Ein fehlgeschlagener Cleanup soll
     * den Backend-Start nicht blockieren.
     */
  }
}

void runStartupMigrations();


app.listen(
  port,
  "0.0.0.0",
  () => {
    console.log(
      `SaveWise backend running on http://localhost:${port}`,
    );

    console.log(
      `Health check: http://localhost:${port}/health`,
    );

    console.log(
      `Discoveries: http://localhost:${port}/api/discoveries`,
    );

    console.log(
      `Knowledge library: http://localhost:${port}/api/knowledge`,
    );

    console.log(
      `AI knowledge graph: http://localhost:${port}/api/knowledge/graph`,
    );
  },
);

startResearchScheduler(async () => {
  const state = await getResearchState();
  if (!isResearchDue(state)) return;
  const library = await buildCurrentKnowledgeLibrary(
    discoveryRepository,
  );

  if (library.graph) {
    await runPersonalResearch(library.discoveries, library.graph);
  }
});
