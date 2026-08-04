import type {
  KnowledgeAnswer,
  KnowledgeConversationMessage,
  KnowledgeDocument,
  KnowledgeDocumentType,
  SecondBrainOverview,
} from "@savewise/shared";

import { localSecondBrainRepository } from "@/repositories/local-second-brain-repository";
import {
  askKnowledgeQuestion,
  generateKnowledgeDocument,
  getSecondBrainOverview,
} from "@/services/content-import-client";

export class HybridSecondBrainRepository {
  async getOverview(): Promise<
    SecondBrainOverview | null
  > {
    return localSecondBrainRepository.getOverview();
  }

  async refreshOverview(): Promise<
    SecondBrainOverview
  > {
    try {
      const overview =
        await getSecondBrainOverview();

      await localSecondBrainRepository.saveOverview(
        overview,
      );

      return overview;
    } catch (error) {
      const localOverview =
        await localSecondBrainRepository.getOverview();

      if (localOverview) {
        console.warn(
          "Backend unavailable. Using local Second Brain overview.",
          error,
        );

        return localOverview;
      }

      throw error;
    }
  }

  async getOrRefreshOverview(): Promise<
    SecondBrainOverview | null
  > {
    const localOverview =
      await this.getOverview();

    if (localOverview) {
      return localOverview;
    }

    try {
      return await this.refreshOverview();
    } catch {
      return null;
    }
  }

  async getConversation(): Promise<
    KnowledgeAnswer[]
  > {
    return localSecondBrainRepository.getConversation();
  }

  async ask(
    question: string,
    history: KnowledgeConversationMessage[],
  ): Promise<KnowledgeAnswer> {
    const answer =
      await askKnowledgeQuestion(
        question,
        history,
      );

    const conversation =
      await localSecondBrainRepository.getConversation();

    await localSecondBrainRepository.saveConversation([
      ...conversation,
      answer,
    ]);

    return answer;
  }

  async saveConversation(
    conversation: KnowledgeAnswer[],
  ): Promise<void> {
    await localSecondBrainRepository.saveConversation(
      conversation,
    );
  }

  async clearConversation(): Promise<void> {
    await localSecondBrainRepository.clearConversation();
  }

  async getDocument(): Promise<
    KnowledgeDocument | null
  > {
    return localSecondBrainRepository.getDocument();
  }

  async createDocument(
    type: KnowledgeDocumentType,
    instruction: string,
  ): Promise<KnowledgeDocument> {
    const document =
      await generateKnowledgeDocument(
        type,
        instruction,
      );

    await localSecondBrainRepository.saveDocument(
      document,
    );

    return document;
  }
}

export const hybridSecondBrainRepository =
  new HybridSecondBrainRepository();