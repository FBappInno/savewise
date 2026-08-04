import type {
  KnowledgeAnswer,
  KnowledgeDocument,
  SecondBrainOverview,
} from "@savewise/shared";

import { localDocumentRepository } from "@/repositories/local-document-repository";

const SECOND_BRAIN_OVERVIEW_KEY =
  "second-brain-overview";

const SECOND_BRAIN_CONVERSATION_KEY =
  "second-brain-conversation";

const SECOND_BRAIN_DOCUMENT_KEY =
  "second-brain-document";

export class LocalSecondBrainRepository {
  async getOverview(): Promise<
    SecondBrainOverview | null
  > {
    const stored =
      await localDocumentRepository.get<SecondBrainOverview>(
        SECOND_BRAIN_OVERVIEW_KEY,
      );

    return stored?.value ?? null;
  }

  async saveOverview(
    overview: SecondBrainOverview,
  ): Promise<void> {
    await localDocumentRepository.save(
      SECOND_BRAIN_OVERVIEW_KEY,
      overview,
    );
  }

  async getConversation(): Promise<
    KnowledgeAnswer[]
  > {
    const stored =
      await localDocumentRepository.get<KnowledgeAnswer[]>(
        SECOND_BRAIN_CONVERSATION_KEY,
      );

    return Array.isArray(
      stored?.value,
    )
      ? stored.value
      : [];
  }

  async saveConversation(
    conversation: KnowledgeAnswer[],
  ): Promise<void> {
    await localDocumentRepository.save(
      SECOND_BRAIN_CONVERSATION_KEY,
      conversation.slice(-30),
    );
  }

  async clearConversation(): Promise<void> {
    await localDocumentRepository.delete(
      SECOND_BRAIN_CONVERSATION_KEY,
    );
  }

  async getDocument(): Promise<
    KnowledgeDocument | null
  > {
    const stored =
      await localDocumentRepository.get<KnowledgeDocument>(
        SECOND_BRAIN_DOCUMENT_KEY,
      );

    return stored?.value ?? null;
  }

  async saveDocument(
    document: KnowledgeDocument,
  ): Promise<void> {
    await localDocumentRepository.save(
      SECOND_BRAIN_DOCUMENT_KEY,
      document,
    );
  }

  async clear(): Promise<void> {
    await Promise.all([
      localDocumentRepository.delete(
        SECOND_BRAIN_OVERVIEW_KEY,
      ),

      localDocumentRepository.delete(
        SECOND_BRAIN_CONVERSATION_KEY,
      ),

      localDocumentRepository.delete(
        SECOND_BRAIN_DOCUMENT_KEY,
      ),
    ]);
  }
}

export const localSecondBrainRepository =
  new LocalSecondBrainRepository();