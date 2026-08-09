import type {
  KnowledgeGraph,
  KnowledgeLibrary,
} from "@savewise/shared";

import {
  localKnowledgeRepository,
} from "@/repositories/local-knowledge-repository";

import {
  getKnowledgeLibrary,
  rebuildKnowledgeLibrary,
  updateKnowledgeTopic,
} from "@/services/content-import-client";

export class HybridKnowledgeRepository {
  async getLibrary(): Promise<
    KnowledgeLibrary | null
  > {
    return localKnowledgeRepository.getLibrary();
  }

  async refresh(): Promise<
    KnowledgeLibrary
  > {
    try {
      /*
       * Das Backend ist die Source of Truth.
       *
       * Die komplette Library inklusive
       * Discoveries und Klassifikationen
       * kommt aus derselben Quelle wie im Web.
       */
      const remoteLibrary =
        await getKnowledgeLibrary();

      await localKnowledgeRepository.saveLibrary(
        remoteLibrary,
      );

      return remoteLibrary;
    } catch (error) {
      /*
       * Nur wenn das Backend nicht erreichbar
       * ist, verwenden wir den letzten lokalen
       * Stand als Offline-Fallback.
       */
      const localLibrary =
        await localKnowledgeRepository.getLibrary();

      if (localLibrary) {
        console.warn(
          "Backend unavailable. Using cached knowledge library.",
          error,
        );

        return localLibrary;
      }

      throw error;
    }
  }

  async getOrRefresh(): Promise<
    KnowledgeLibrary | null
  > {
    try {
      return await this.refresh();
    } catch {
      return localKnowledgeRepository.getLibrary();
    }
  }

  async rebuild(): Promise<
    KnowledgeLibrary
  > {
    const response =
      await rebuildKnowledgeLibrary();

    await localKnowledgeRepository.saveLibrary(
      response.library,
    );

    return response.library;
  }

  async updateTopic(
    nodeId: string,
    update: {
      title: string;
      parentId: string | null;
    },
  ): Promise<KnowledgeGraph> {
    const response =
      await updateKnowledgeTopic(
        nodeId,
        update,
      );

    await localKnowledgeRepository.saveGraph(
      response.graph,
    );

    const localLibrary =
      await localKnowledgeRepository.getLibrary();

    if (localLibrary) {
      await localKnowledgeRepository.saveLibrary({
        ...localLibrary,

        generatedAt:
          new Date().toISOString(),

        graph:
          response.graph,
      });
    }

    return response.graph;
  }

  async getGraph(): Promise<
    KnowledgeGraph | null
  > {
    const localLibrary =
      await localKnowledgeRepository.getLibrary();

    if (localLibrary?.graph) {
      return localLibrary.graph;
    }

    return localKnowledgeRepository.getGraph();
  }

  async getLastUpdate(): Promise<
    string | null
  > {
    return localKnowledgeRepository.getLastUpdate();
  }
}

export const hybridKnowledgeRepository =
  new HybridKnowledgeRepository();
