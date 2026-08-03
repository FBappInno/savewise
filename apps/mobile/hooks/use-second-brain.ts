import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  askKnowledgeQuestion,
  generateKnowledgeDocument,
  getSecondBrainOverview,
} from "@/services/content-import-client";
import type {
  KnowledgeAnswer,
  KnowledgeConversationMessage,
  KnowledgeDocument,
  KnowledgeDocumentType,
  SecondBrainOverview,
} from "@savewise/shared";

export function useSecondBrain() {
  const [overview, setOverview] =
    useState<SecondBrainOverview | null>(null);
  const [answer, setAnswer] =
    useState<KnowledgeAnswer | null>(null);
  const [conversation, setConversation] = useState<KnowledgeAnswer[]>([]);
  const [document, setDocument] = useState<KnowledgeDocument | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] =
    useState(false);
  const [isAnswering, setIsAnswering] =
    useState(false);
  const [overviewError, setOverviewError] =
    useState<string | null>(null);
  const [answerError, setAnswerError] =
    useState<string | null>(null);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);

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
      const history: KnowledgeConversationMessage[] = conversation.flatMap((turn) => [
        { role: "user" as const, content: turn.question },
        { role: "assistant" as const, content: turn.answer },
      ]).slice(-12);
      const nextAnswer = await askKnowledgeQuestion(normalizedQuestion, history);
      setAnswer(nextAnswer);
      setConversation((current) => [...current, nextAnswer]);
    } catch (error) {
      setAnswerError(getErrorMessage(error));
    } finally {
      setIsAnswering(false);
    }
  }, [conversation]);

  const createDocument = useCallback(async (
    type: KnowledgeDocumentType,
    instruction: string,
  ) => {
    setDocumentError(null);
    setIsGeneratingDocument(true);
    try {
      setDocument(await generateKnowledgeDocument(type, instruction));
    } catch (error) {
      setDocumentError(getErrorMessage(error));
    } finally {
      setIsGeneratingDocument(false);
    }
  }, []);

  const clearConversation = useCallback(() => {
    setAnswer(null);
    setConversation([]);
    setAnswerError(null);
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  return {
    overview,
    answer,
    conversation,
    document,
    isLoadingOverview,
    isAnswering,
    isGeneratingDocument,
    overviewError,
    answerError,
    documentError,
    loadOverview,
    ask,
    createDocument,
    clearConversation,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Second Brain ist momentan nicht verfügbar.";
}
