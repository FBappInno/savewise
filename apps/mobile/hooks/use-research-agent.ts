import {
  useCallback,
  useState,
} from "react";

import { useFocusEffect } from "@react-navigation/native";

import {
  classifyAnonymousError,
  trackAnonymousEvent,
} from "@/services/anonymous-analytics";
import { localKnowledgeEngine } from "@/services/local-knowledge-engine";
import type {
  ResearchState,
} from "@savewise/shared";

export function useResearchAgent() {
  const [
    research,
    setResearch,
  ] =
    useState<ResearchState | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isResearching,
    setIsResearching,
  ] =
    useState(false);

  const [
    activeCandidateId,
    setActiveCandidateId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const load =
    useCallback(async () => {
      setError(null);
      setIsLoading(true);

      try {
        const localResearch =
          await localKnowledgeEngine.getResearchState();

        if (localResearch) {
          setResearch(
            localResearch,
          );

          return;
        }

        try {
          const refreshedResearch =
            await localKnowledgeEngine.refreshResearchState();

          setResearch(
            refreshedResearch,
          );
        } catch {
          setResearch(null);
        }
      } catch (loadError) {
        setError(
          getErrorMessage(
            loadError,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  const run =
    useCallback(async () => {
      setError(null);
      setIsResearching(true);

      const startedAt =
        Date.now();

      void trackAnonymousEvent(
        "ResearchAgentStarted",
        {
          operation: "research",
        },
      );

      try {
        const updatedResearch =
          await localKnowledgeEngine.runResearch();

        setResearch(
          updatedResearch,
        );
      } catch (runError) {
        void trackAnonymousEvent(
          "ErrorOccurred",
          {
            durationMs:
              Date.now() -
              startedAt,

            operation:
              "research",

            errorKind:
              classifyAnonymousError(
                runError,
              ),
          },
        );

        setError(
          getErrorMessage(
            runError,
          ),
        );
      } finally {
        setIsResearching(false);
      }
    }, []);

  const dismiss =
    useCallback(
      async (
        candidateId: string,
      ) => {
        setActiveCandidateId(
          candidateId,
        );

        setError(null);

        try {
          const updatedResearch =
            await localKnowledgeEngine.updateResearchCandidate(
              candidateId,
              "dismissed",
            );

          setResearch(
            updatedResearch,
          );

          void trackAnonymousEvent(
            "ResearchSuggestionIgnored",
            {
              operation:
                "research",
            },
          );
        } catch (dismissError) {
          setError(
            getErrorMessage(
              dismissError,
            ),
          );
        } finally {
          setActiveCandidateId(
            null,
          );
        }
      },
      [],
    );

  const save =
    useCallback(
      async (
        candidateId: string,
      ) => {
        setActiveCandidateId(
          candidateId,
        );

        setError(null);

        try {
          const result =
            await localKnowledgeEngine.saveResearchCandidate(
              candidateId,
            );

          setResearch(
            result.research,
          );

          void trackAnonymousEvent(
            "ResearchSuggestionAccepted",
            {
              operation:
                "research",
            },
          );
        } catch (saveError) {
          setError(
            getErrorMessage(
              saveError,
            ),
          );
        } finally {
          setActiveCandidateId(
            null,
          );
        }
      },
      [],
    );

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

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : "Der Research Agent ist momentan nicht verfügbar.";
}