import "dotenv/config";

import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { z } from "zod";

import { importContent } from "./services/import/content-import-service";
import {
  rebuildKnowledgeLibrary,
  readKnowledgeLibrary,
  getRelatedDiscoveries,
  getDiscoveriesForInterest,
} from "./services/knowledge/knowledge-engine";

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Import timed out after ${timeoutMs / 1000} seconds.`,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.disable("x-powered-by");

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "20kb" }));

const ImportRequestSchema = z.object({
  url: z.string().trim().url(),
});

const LimitQuerySchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20);

const DiscoveryIdSchema = z.string().trim().min(1);

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "savewise-backend",
    timestamp: new Date().toISOString(),
  });
});

/**
 * URL importieren, Metadaten lesen und Inhalt analysieren.
 *
 * Falls importContent die Discovery bereits speichert,
 * wird anschließend automatisch die Wissensbibliothek neu aufgebaut.
 */
app.post("/api/import", async (request, response) => {
  const parsedRequest = ImportRequestSchema.safeParse(
    request.body,
  );

  if (!parsedRequest.success) {
    response.status(400).json({
      error: "A valid URL is required.",
      details: parsedRequest.error.flatten(),
    });

    return;
  }

  try {
    const result = await withTimeout(
      importContent(parsedRequest.data.url),
      45_000,
    );

    let knowledgeUpdate:
      | {
          generatedAt: string | null;
          totalDiscoveries: number;
          totalInterests: number;
          totalRelations: number;
        }
      | null = null;

    try {
      const library = await rebuildKnowledgeLibrary();

      knowledgeUpdate = {
        generatedAt: library.generatedAt,
        totalDiscoveries:
          library.statistics.totalDiscoveries,
        totalInterests: library.interests.length,
        totalRelations:
          library.statistics.totalRelations,
      };
    } catch (knowledgeError) {
      /*
       * Der eigentliche Import bleibt erfolgreich, auch wenn
       * der Wissensindex einmal nicht aufgebaut werden kann.
       */
      console.error(
        "Knowledge library rebuild failed:",
        knowledgeError,
      );
    }

    response.status(200).json({
      ...result,
      knowledgeUpdate,
    });
  } catch (error) {
    console.error("Content import failed:", error);

    response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Content import failed.",
    });
  }
});

/**
 * Vollständige persönliche Wissensbibliothek abrufen.
 */
app.get("/api/knowledge", async (_request, response) => {
  try {
    const library = await readKnowledgeLibrary();

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
});

/**
 * Wissensbibliothek manuell vollständig neu aufbauen.
 */
app.post(
  "/api/knowledge/rebuild",
  async (_request, response) => {
    try {
      const library = await rebuildKnowledgeLibrary();

      response.json({
        message: "Knowledge library rebuilt successfully.",
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

/**
 * Erkannte Interessen abrufen.
 *
 * Beispiel:
 * GET /api/knowledge/interests?limit=10
 */
app.get(
  "/api/knowledge/interests",
  async (request, response) => {
    const parsedLimit = LimitQuerySchema.safeParse(
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
      const library = await readKnowledgeLibrary();

      response.json({
        generatedAt: library.generatedAt,
        interests: library.interests.slice(
          0,
          parsedLimit.data,
        ),
      });
    } catch (error) {
      console.error("Interests could not be loaded:", error);

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Interests could not be loaded.",
      });
    }
  },
);

/**
 * Discoveries zu einem bestimmten Interesse abrufen.
 *
 * Beispiel:
 * GET /api/knowledge/interests/artificial%20intelligence/discoveries
 */
app.get(
  "/api/knowledge/interests/:interestKey/discoveries",
  async (request, response) => {
    const parsedLimit = LimitQuerySchema.safeParse(
      request.query.limit,
    );

    if (!parsedLimit.success) {
      response.status(400).json({
        error:
          "The limit must be a number between 1 and 100.",
      });

      return;
    }

    const interestKey = request.params.interestKey.trim();

    if (!interestKey) {
      response.status(400).json({
        error: "An interest key is required.",
      });

      return;
    }

    try {
      const result = await getDiscoveriesForInterest(
        interestKey,
        {
          limit: parsedLimit.data,
        },
      );

      if (!result.interest) {
        response.status(404).json({
          error: "Interest not found.",
        });

        return;
      }

      response.json(result);
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

/**
 * Verwandte Discoveries abrufen.
 *
 * Beispiel:
 * GET /api/knowledge/related/DISCOVERY_ID?limit=5
 */
app.get(
  "/api/knowledge/related/:discoveryId",
  async (request, response) => {
    const parsedDiscoveryId = DiscoveryIdSchema.safeParse(
      request.params.discoveryId,
    );

    if (!parsedDiscoveryId.success) {
      response.status(400).json({
        error: "A valid discovery ID is required.",
      });

      return;
    }

    const parsedLimit = LimitQuerySchema.safeParse(
      request.query.limit ?? 5,
    );

    if (!parsedLimit.success) {
      response.status(400).json({
        error:
          "The limit must be a number between 1 and 100.",
      });

      return;
    }

    try {
      const related = await getRelatedDiscoveries(
        parsedDiscoveryId.data,
        {
          limit: Math.min(parsedLimit.data, 20),
        },
      );

      response.json({
        discoveryId: parsedDiscoveryId.data,
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

/**
 * Persönliche Trends abrufen.
 */
app.get(
  "/api/knowledge/trends",
  async (_request, response) => {
    try {
      const library = await readKnowledgeLibrary();

      response.json({
        generatedAt: library.generatedAt,
        trends: library.trends,
      });
    } catch (error) {
      console.error("Trends could not be loaded:", error);

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Trends could not be loaded.",
      });
    }
  },
);

/**
 * Kategorien abrufen.
 */
app.get(
  "/api/knowledge/categories",
  async (_request, response) => {
    try {
      const library = await readKnowledgeLibrary();

      response.json({
        generatedAt: library.generatedAt,
        categories: library.categories,
      });
    } catch (error) {
      console.error("Categories could not be loaded:", error);

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Categories could not be loaded.",
      });
    }
  },
);

/**
 * Themen abrufen.
 */
app.get(
  "/api/knowledge/topics",
  async (_request, response) => {
    try {
      const library = await readKnowledgeLibrary();

      response.json({
        generatedAt: library.generatedAt,
        topics: library.topics,
      });
    } catch (error) {
      console.error("Topics could not be loaded:", error);

      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Topics could not be loaded.",
      });
    }
  },
);

/**
 * Nicht vorhandene API-Route.
 */
app.use("/api", (request, response) => {
  response.status(404).json({
    error: "API route not found.",
    method: request.method,
    path: request.originalUrl,
  });
});

/**
 * Zentraler Express-Error-Handler.
 */
app.use(
  (
    error: unknown,
    _request: Request,
    response: Response,
    _next: NextFunction,
  ) => {
    console.error("Unhandled server error:", error);

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

app.listen(port, "0.0.0.0", () => {
  console.log(
    `SaveWise backend running on http://localhost:${port}`,
  );

  console.log(
    `Health check: http://localhost:${port}/health`,
  );

  console.log(
    `Knowledge library: http://localhost:${port}/api/knowledge`,
  );
});