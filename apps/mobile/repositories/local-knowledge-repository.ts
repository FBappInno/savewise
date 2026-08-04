import type {
  KnowledgeGraph,
  KnowledgeLibrary,
} from "@savewise/shared";

import { localDocumentRepository } from "@/repositories/local-document-repository";

const KNOWLEDGE_LIBRARY_KEY =
  "knowledge-library";

const KNOWLEDGE_GRAPH_KEY =
  "knowledge-graph";

export class LocalKnowledgeRepository {
  async getLibrary(): Promise<
    KnowledgeLibrary | null
  > {
    const storedDocument =
      await localDocumentRepository.get<KnowledgeLibrary>(
        KNOWLEDGE_LIBRARY_KEY,
      );

    return (
      storedDocument?.value ??
      null
    );
  }

  async saveLibrary(
    library: KnowledgeLibrary,
  ): Promise<void> {
    await localDocumentRepository.save(
      KNOWLEDGE_LIBRARY_KEY,
      library,
    );

    if (library.graph) {
      await this.saveGraph(
        library.graph,
      );
    }
  }

  async getGraph(): Promise<
    KnowledgeGraph | null
  > {
    const storedDocument =
      await localDocumentRepository.get<KnowledgeGraph>(
        KNOWLEDGE_GRAPH_KEY,
      );

    return (
      storedDocument?.value ??
      null
    );
  }

  async saveGraph(
    graph: KnowledgeGraph,
  ): Promise<void> {
    await localDocumentRepository.save(
      KNOWLEDGE_GRAPH_KEY,
      graph,
    );
  }

  async getLastUpdate(): Promise<
    string | null
  > {
    const storedDocument =
      await localDocumentRepository.get<KnowledgeLibrary>(
        KNOWLEDGE_LIBRARY_KEY,
      );

    if (!storedDocument) {
      return null;
    }

    return (
      storedDocument.value.graph
        ?.generatedAt ??
      storedDocument.value
        .generatedAt ??
      storedDocument.updatedAt
    );
  }

  async clear(): Promise<void> {
    await Promise.all([
      localDocumentRepository.delete(
        KNOWLEDGE_LIBRARY_KEY,
      ),

      localDocumentRepository.delete(
        KNOWLEDGE_GRAPH_KEY,
      ),
    ]);
  }
}

export const localKnowledgeRepository =
  new LocalKnowledgeRepository();