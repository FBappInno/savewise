import type {
  ResearchState,
} from "@savewise/shared";

import { localDocumentRepository } from "@/repositories/local-document-repository";

const RESEARCH_STATE_KEY =
  "research-state";

export class LocalResearchRepository {
  async getState(): Promise<
    ResearchState | null
  > {
    const stored =
      await localDocumentRepository.get<ResearchState>(
        RESEARCH_STATE_KEY,
      );

    return stored?.value ?? null;
  }

  async saveState(
    research: ResearchState,
  ): Promise<void> {
    await localDocumentRepository.save(
      RESEARCH_STATE_KEY,
      research,
    );
  }

  async clear(): Promise<void> {
    await localDocumentRepository.delete(
      RESEARCH_STATE_KEY,
    );
  }
}

export const localResearchRepository =
  new LocalResearchRepository();