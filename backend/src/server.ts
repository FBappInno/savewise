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
  rebuildCurrentKnowledgeLibrary,
  saveDiscovery,
} from "./services/discoveries/discovery-service";
import { importContent } from "./services/import/content-import-service";
import {
  analyzeSecondBrain,
  answerKnowledgeQuestion,
} from "./services/ai/openai-second-brain";

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

const KnowledgeQuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3)
    .max(500),
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

app.get(
  "/api/knowledge/graph",
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
  async (_request, response) => {
    try {
      const library =
        await rebuildCurrentKnowledgeLibrary(
          discoveryRepository,
        );

      response.json({
        message:
          "Knowledge library and AI knowledge graph rebuilt successfully.",

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
        ),
        100_000,
      );

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
        ),
        100_000,
      );

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

    console.log(
      `AI knowledge graph: http://localhost:${port}/api/knowledge/graph`,
    );
  },
);
