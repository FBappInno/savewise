import "dotenv/config";

import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { z } from "zod";

import { FileDiscoveryRepository } from "./repositories/file-discovery-repository";
import {
  buildCurrentKnowledgeLibrary,
  deleteDiscovery,
  getAllDiscoveries,
  getDiscoveriesForInterest,
  getDiscoveryById,
  getRelatedDiscoveries,
  saveDiscovery,
} from "./services/discoveries/discovery-service";
import { importContent } from "./services/import/content-import-service";

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId:
    | NodeJS.Timeout
    | undefined;

  const timeoutPromise =
    new Promise<T>((_, reject) => {
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

const app = express();

const port = Number(
  process.env.PORT ?? 3001,
);

const discoveryRepository =
  new FileDiscoveryRepository();

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
      "Content-Type",
      "Authorization",
    ],
  }),
);

app.use(
  express.json({
    limit: "20kb",
  }),
);

const ImportRequestSchema = z.object({
  url: z.string().trim().url(),
});

const DiscoveryIdSchema = z
  .string()
  .trim()
  .min(1);

const LimitQuerySchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20);

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
      const importResult =
        await withTimeout(
          importContent(
            parsedRequest.data.url,
          ),
          90_000,
        );

      const storedDiscovery =
        await saveDiscovery(
          discoveryRepository,
          importResult.discovery,
        );

      const library =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
        );

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
        },
      });
    } catch (error) {
      console.error(
        "Content import failed:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Content import failed.",
      });
    }
  },
);

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
  async (_request, response) => {
    try {
      const library =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
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

app.post(
  "/api/knowledge/rebuild",
  async (_request, response) => {
    try {
      const library =
        await buildCurrentKnowledgeLibrary(
          discoveryRepository,
        );

      response.json({
        message:
          "Knowledge library rebuilt successfully.",

        library,
      });
    } catch (error) {
      console.error(
        "Knowledge library rebuild failed:",
        error,
      );

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Knowledge library rebuild failed.",
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

      const interest =
        library.interests.find(
          (item) =>
            item.id === interestId,
        );

      if (!interest) {
        response.status(404).json({
          error:
            "Interest not found.",
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
        interest,
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
  },
);