import type {
  KnowledgeGraph,
  KnowledgeLibrary,
} from "@savewise/shared";

import { hybridDiscoveryRepository } from "@/repositories/hybrid-discovery-repository";
import { localKnowledgeRepository } from "@/repositories/local-knowledge-repository";
import {
  getKnowledgeLibrary,
  rebuildKnowledgeLibrary,
  updateKnowledgeTopic,
} from "@/services/content-import-client";

export class HybridKnowledgeRepository {
  async getLibrary(): Promise<
    KnowledgeLibrary | null
  > {
    const localLibrary =
      await localKnowledgeRepository.getLibrary();

    if (!localLibrary) {
      return null;
    }

    return this.attachCurrentLocalDiscoveries(
      localLibrary,
    );
  }

  async refresh(): Promise<
    KnowledgeLibrary
  > {
    try {
      const remoteLibrary =
        await getKnowledgeLibrary();

      await localKnowledgeRepository.saveLibrary(
        remoteLibrary,
      );

      return remoteLibrary;
    } catch (error) {
      const localLibrary =
        await this.getLibrary();

      if (localLibrary) {
        console.warn(
          "Backend unavailable. Using local knowledge library.",
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
    const localLibrary =
      await this.getLibrary();

    if (localLibrary) {
      return localLibrary;
    }

    try {
      return await this.refresh();
    } catch {
      return null;
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
      await this.getLibrary();

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

  private async attachCurrentLocalDiscoveries(
    library: KnowledgeLibrary,
  ): Promise<KnowledgeLibrary> {
    const localDiscoveries =
      await hybridDiscoveryRepository.getAll();

    return {
      ...library,

      discoveries:
        localDiscoveries,
    };
  }
}

export const hybridKnowledgeRepository =
  new HybridKnowledgeRepository();