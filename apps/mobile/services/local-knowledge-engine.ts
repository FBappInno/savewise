import type {
  KnowledgeAnswer,
  KnowledgeConversationMessage,
  KnowledgeDocument,
  KnowledgeDocumentType,
  KnowledgeGraph,
  KnowledgeLibrary,
  ResearchCandidateStatus,
  ResearchState,
  SecondBrainOverview,
} from "@savewise/shared";

import { hybridDiscoveryRepository } from "@/repositories/hybrid-discovery-repository";
import { hybridKnowledgeRepository } from "@/repositories/hybrid-knowledge-repository";
import { hybridResearchRepository } from "@/repositories/hybrid-research-repository";
import { hybridSecondBrainRepository } from "@/repositories/hybrid-second-brain-repository";
import { findLocalRelatedDiscoveries } from "@/services/local-related-discoveries";
import type {
  Discovery,
  DiscoveryUpdate,
} from "@/types/discovery";

export class LocalKnowledgeEngine {
  async getDiscoveries(): Promise<
    Discovery[]
  > {
    return hybridDiscoveryRepository.getAll();
  }

  async refreshDiscoveries(): Promise<
    Discovery[]
  > {
    return hybridDiscoveryRepository.refresh();
  }

  async getDiscovery(
    discoveryId: string,
  ): Promise<Discovery | null> {
    return hybridDiscoveryRepository.getById(
      discoveryId,
    );
  }

  async importDiscovery(
    url: string,
    preferredKnowledgePath?: string[],
  ): Promise<Discovery> {
    return hybridDiscoveryRepository.importFromUrl(
      url,
      preferredKnowledgePath,
    );
  }

  async updateDiscovery(
    discoveryId: string,
    update: DiscoveryUpdate,
  ): Promise<Discovery> {
    return hybridDiscoveryRepository.update(
      discoveryId,
      update,
    );
  }

  async deleteDiscovery(
    discoveryId: string,
  ): Promise<void> {
    await hybridDiscoveryRepository.delete(
      discoveryId,
    );
  }

  async getLibrary(): Promise<
    KnowledgeLibrary | null
  > {
    return hybridKnowledgeRepository.getLibrary();
  }

  async refreshLibrary(): Promise<
    KnowledgeLibrary
  > {
    return hybridKnowledgeRepository.refresh();
  }

  async rebuildLibrary(): Promise<
    KnowledgeLibrary
  > {
    return hybridKnowledgeRepository.rebuild();
  }

  async getKnowledgeGraph(): Promise<
    KnowledgeGraph | null
  > {
    return hybridKnowledgeRepository.getGraph();
  }

  async getRelatedDiscoveries(
    discoveryId: string,
    limit = 5,
  ) {
    const discoveries =
      await this.getDiscoveries();

    const sourceDiscovery =
      discoveries.find(
        (discovery) =>
          discovery.id === discoveryId,
      );

    if (!sourceDiscovery) {
      return [];
    }

    return findLocalRelatedDiscoveries(
      sourceDiscovery,
      discoveries,
      limit,
    );
  }

  async getSecondBrainOverview(): Promise<
    SecondBrainOverview | null
  > {
    return hybridSecondBrainRepository.getOverview();
  }

  async refreshSecondBrainOverview(): Promise<
    SecondBrainOverview
  > {
    return hybridSecondBrainRepository.refreshOverview();
  }

  async getSecondBrainConversation(): Promise<
    KnowledgeAnswer[]
  > {
    return hybridSecondBrainRepository.getConversation();
  }

  async askKnowledgeQuestion(
    question: string,
    history: KnowledgeConversationMessage[],
  ): Promise<KnowledgeAnswer> {
    return hybridSecondBrainRepository.ask(
      question,
      history,
    );
  }

  async clearSecondBrainConversation(): Promise<void> {
    await hybridSecondBrainRepository.clearConversation();
  }

  async getKnowledgeDocument(): Promise<
    KnowledgeDocument | null
  > {
    return hybridSecondBrainRepository.getDocument();
  }

  async generateKnowledgeDocument(
    type: KnowledgeDocumentType,
    instruction: string,
  ): Promise<KnowledgeDocument> {
    return hybridSecondBrainRepository.createDocument(
      type,
      instruction,
    );
  }

  async getResearchState(): Promise<
    ResearchState | null
  > {
    return hybridResearchRepository.getState();
  }

  async refreshResearchState(): Promise<
    ResearchState
  > {
    return hybridResearchRepository.refresh();
  }

  async runResearch(): Promise<
    ResearchState
  > {
    return hybridResearchRepository.run();
  }

  async updateResearchCandidate(
    candidateId: string,
    status: Extract<
      ResearchCandidateStatus,
      "suggested" | "dismissed"
    >,
  ): Promise<ResearchState> {
    return hybridResearchRepository.updateCandidate(
      candidateId,
      status,
    );
  }

  async saveResearchCandidate(
    candidateId: string,
  ) {
    return hybridResearchRepository.saveCandidate(
      candidateId,
    );
  }
}

export const localKnowledgeEngine =
  new LocalKnowledgeEngine();