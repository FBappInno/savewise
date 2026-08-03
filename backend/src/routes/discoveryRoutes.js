import { Router } from "express";
import {
  createDiscovery,
  deleteDiscovery,
  getAllDiscoveries,
  getDiscoveryById,
} from "../repositories/discoveryRepository.js";
import { rebuildKnowledgeLibrary } from "../services/knowledgeEngine.js";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const discoveries = await getAllDiscoveries();
    response.json({ discoveries });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  try {
    const discovery = await getDiscoveryById(request.params.id);

    if (!discovery) {
      return response.status(404).json({
        error: "Discovery wurde nicht gefunden.",
      });
    }

    return response.json({ discovery });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    /*
     * Hier kann davor weiterhin eure bestehende URL- und
     * OpenAI-Analyse stattfinden.
     */
    const discovery = await createDiscovery(request.body);

    /*
     * Bei einer lokalen App mit überschaubarer Datenmenge kann
     * synchron neu aufgebaut werden.
     */
    const library = await rebuildKnowledgeLibrary();

    response.status(201).json({
      discovery,
      knowledgeUpdate: {
        generatedAt: library.generatedAt,
        totalInterests: library.interests.length,
        totalRelations: library.statistics.totalRelations,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (request, response, next) => {
  try {
    const deleted = await deleteDiscovery(request.params.id);

    if (!deleted) {
      return response.status(404).json({
        error: "Discovery wurde nicht gefunden.",
      });
    }

    await rebuildKnowledgeLibrary();

    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;