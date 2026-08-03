import { Router } from "express";
import {
  getDiscoveriesForInterest,
  getRelatedDiscoveries,
  readKnowledgeLibrary,
  rebuildKnowledgeLibrary,
} from "../services/knowledgeEngine.js";

const router = Router();

/**
 * Gesamte persönliche Wissensbibliothek
 */
router.get("/", async (request, response, next) => {
  try {
    const library = await readKnowledgeLibrary();
    response.json(library);
  } catch (error) {
    next(error);
  }
});

/**
 * Bibliothek manuell neu aufbauen
 */
router.post("/rebuild", async (request, response, next) => {
  try {
    const library = await rebuildKnowledgeLibrary();

    response.json({
      message: "Knowledge Library wurde neu aufgebaut.",
      library,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Erkannte Interessen
 */
router.get("/interests", async (request, response, next) => {
  try {
    const library = await readKnowledgeLibrary();

    const requestedLimit = Number(request.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 20;

    response.json({
      interests: library.interests.slice(0, limit),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Inhalte für ein bestimmtes Interesse
 */
router.get(
  "/interests/:interestKey/discoveries",
  async (request, response, next) => {
    try {
      const requestedLimit = Number(request.query.limit);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), 100)
        : 50;

      const result = await getDiscoveriesForInterest(
        request.params.interestKey,
        { limit }
      );

      if (!result.interest) {
        return response.status(404).json({
          error: "Interesse wurde nicht gefunden.",
        });
      }

      return response.json(result);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * Verwandte Discoveries
 */
router.get(
  "/related/:discoveryId",
  async (request, response, next) => {
    try {
      const requestedLimit = Number(request.query.limit);
      const limit = Number.isFinite(requestedLimit)
        ? Math.min(Math.max(requestedLimit, 1), 20)
        : 5;

      const related = await getRelatedDiscoveries(
        request.params.discoveryId,
        { limit }
      );

      response.json({
        discoveryId: request.params.discoveryId,
        related,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Aktuelle persönliche Trends
 */
router.get("/trends/current", async (request, response, next) => {
  try {
    const library = await readKnowledgeLibrary();

    response.json({
      generatedAt: library.generatedAt,
      trends: library.trends,
    });
  } catch (error) {
    next(error);
  }
});

export default router;