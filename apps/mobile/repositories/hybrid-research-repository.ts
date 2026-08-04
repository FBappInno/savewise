import type {
  Discovery,
  ResearchCandidateStatus,
  ResearchState,
} from "@savewise/shared";

import { localResearchRepository } from "@/repositories/local-research-repository";
import {
  getResearchState,
  runPersonalResearch,
  saveResearchCandidate,
  updateResearchCandidate,
} from "@/services/content-import-client";

export class HybridResearchRepository {
  async getState(): Promise<
    ResearchState | null
  > {
    return localResearchRepository.getState();
  }

  async refresh(): Promise<
    ResearchState
  > {
    try {
      const research =
        await getResearchState();

      await localResearchRepository.saveState(
        research,
      );

      return research;
    } catch (error) {
      const localResearch =
        await localResearchRepository.getState();

      if (localResearch) {
        console.warn(
          "Backend unavailable. Using local research state.",
          error,
        );

        return localResearch;
      }

      throw error;
    }
  }

  async getOrRefresh(): Promise<
    ResearchState | null
  > {
    const localResearch =
      await this.getState();

    if (localResearch) {
      return localResearch;
    }

    try {
      return await this.refresh();
    } catch {
      return null;
    }
  }

  async run(): Promise<
    ResearchState
  > {
    const research =
      await runPersonalResearch();

    await localResearchRepository.saveState(
      research,
    );

    return research;
  }

  async updateCandidate(
    candidateId: string,
    status: Extract<
      ResearchCandidateStatus,
      "suggested" | "dismissed"
    >,
  ): Promise<ResearchState> {
    const research =
      await updateResearchCandidate(
        candidateId,
        status,
      );

    await localResearchRepository.saveState(
      research,
    );

    return research;
  }

  async saveCandidate(
    candidateId: string,
  ): Promise<{
    discovery: Discovery;
    research: ResearchState | null;
  }> {
    const result =
      await saveResearchCandidate(
        candidateId,
      );

    if (result.research) {
      await localResearchRepository.saveState(
        result.research,
      );
    }

    return result;
  }
}

export const hybridResearchRepository =
  new HybridResearchRepository();