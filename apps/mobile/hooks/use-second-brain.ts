import {
  useCallback,
  useState,
} from "react";

import {
  askKnowledgeQuestion,
  getSecondBrainOverview,
} from "@/services/content-import-client";
import type {
  KnowledgeAnswer,
  SecondBrainOverview,
} from "@savewise/shared";

export function useSecondBrain() {
  const [overview, setOverview] =
    useState<SecondBrainOverview | null>(null);
  const [answer, setAnswer] =
    useState<KnowledgeAnswer | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] =
    useState(false);
  const [isAnswering, setIsAnswering] =
    useState(false);
  const [overviewError, setOverviewError] =
    useState<string | null>(null);
  const [answerError, setAnswerError] =
    useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setOverviewError(null);
    setIsLoadingOverview(true);

    try {
      setOverview(await getSecondBrainOverview());
    } catch (error) {
      setOverviewError(getErrorMessage(error));
    } finally {
      setIsLoadingOverview(false);
    }
  }, []);

  const ask = useCallback(async (question: string) => {
    const normalizedQuestion = question.trim();

    if (normalizedQuestion.length < 3) {
      setAnswerError("Bitte stelle eine konkrete Frage.");
      return;
    }

    setAnswerError(null);
    setIsAnswering(true);

    try {
      setAnswer(await askKnowledgeQuestion(normalizedQuestion));
    } catch (error) {
      setAnswerError(getErrorMessage(error));
    } finally {
      setIsAnswering(false);
    }
  }, []);

  return {
    overview,
    answer,
    isLoadingOverview,
    isAnswering,
    overviewError,
    answerError,
    loadOverview,
    ask,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Second Brain ist momentan nicht verfügbar.";
}
