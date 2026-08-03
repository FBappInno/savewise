import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";

import {
  getResearchState,
  runPersonalResearch,
  saveResearchCandidate,
  updateResearchCandidate,
} from "@/services/content-import-client";
import type { ResearchState } from "@savewise/shared";

export function useResearchAgent() {
  const [research, setResearch] = useState<ResearchState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResearching, setIsResearching] = useState(false);
  const [activeCandidateId, setActiveCandidateId] =
    useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      setResearch(await getResearchState());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const run = useCallback(async () => {
    setError(null);
    setIsResearching(true);

    try {
      setResearch(await runPersonalResearch());
    } catch (runError) {
      setError(getErrorMessage(runError));
    } finally {
      setIsResearching(false);
    }
  }, []);

  const dismiss = useCallback(async (candidateId: string) => {
    setActiveCandidateId(candidateId);
    setError(null);

    try {
      setResearch(await updateResearchCandidate(candidateId, "dismissed"));
    } catch (dismissError) {
      setError(getErrorMessage(dismissError));
    } finally {
      setActiveCandidateId(null);
    }
  }, []);

  const save = useCallback(async (candidateId: string) => {
    setActiveCandidateId(candidateId);
    setError(null);

    try {
      const result = await saveResearchCandidate(candidateId);
      setResearch(result.research);
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setActiveCandidateId(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return {
    research,
    isLoading,
    isResearching,
    activeCandidateId,
    error,
    run,
    dismiss,
    save,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Der Research Agent ist momentan nicht verfügbar.";
}
