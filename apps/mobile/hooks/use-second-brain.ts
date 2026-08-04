import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { localKnowledgeEngine } from "@/services/local-knowledge-engine";
import type {
  KnowledgeAnswer,
  KnowledgeConversationMessage,
  KnowledgeDocument,
  KnowledgeDocumentType,
  SecondBrainOverview,
} from "@savewise/shared";

export function useSecondBrain() {
  const [
    overview,
    setOverview,
  ] =
    useState<SecondBrainOverview | null>(
      null,
    );

  const [
    answer,
    setAnswer,
  ] =
    useState<KnowledgeAnswer | null>(
      null,
    );

  const [
    conversation,
    setConversation,
  ] =
    useState<KnowledgeAnswer[]>([]);

  const [
    document,
    setDocument,
  ] =
    useState<KnowledgeDocument | null>(
      null,
    );

  const [
    isLoadingOverview,
    setIsLoadingOverview,
  ] =
    useState(true);

  const [
    isAnswering,
    setIsAnswering,
  ] =
    useState(false);

  const [
    overviewError,
    setOverviewError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    answerError,
    setAnswerError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    isGeneratingDocument,
    setIsGeneratingDocument,
  ] =
    useState(false);

  const [
    documentError,
    setDocumentError,
  ] =
    useState<string | null>(
      null,
    );

  const loadLocalState =
    useCallback(async () => {
      setOverviewError(null);
      setIsLoadingOverview(true);

      try {
        const [
          localOverview,
          localConversation,
          localDocument,
        ] = await Promise.all([
          localKnowledgeEngine.getSecondBrainOverview(),
          localKnowledgeEngine.getSecondBrainConversation(),
          localKnowledgeEngine.getKnowledgeDocument(),
        ]);

        setOverview(
          localOverview,
        );

        setConversation(
          localConversation,
        );

        setAnswer(
          localConversation.at(-1) ??
            null,
        );

        setDocument(
          localDocument,
        );

        if (!localOverview) {
          try {
            const refreshedOverview =
              await localKnowledgeEngine.refreshSecondBrainOverview();

            setOverview(
              refreshedOverview,
            );
          } catch {
            // Kein lokaler Stand und Backend nicht erreichbar.
          }
        }
      } catch (error) {
        setOverviewError(
          getErrorMessage(error),
        );
      } finally {
        setIsLoadingOverview(false);
      }
    }, []);

  const loadOverview =
    useCallback(async () => {
      setOverviewError(null);
      setIsLoadingOverview(true);

      try {
        const refreshedOverview =
          await localKnowledgeEngine.refreshSecondBrainOverview();

        setOverview(
          refreshedOverview,
        );
      } catch (error) {
        const localOverview =
          await localKnowledgeEngine.getSecondBrainOverview();

        if (localOverview) {
          setOverview(
            localOverview,
          );

          setOverviewError(null);
        } else {
          setOverviewError(
            getErrorMessage(error),
          );
        }
      } finally {
        setIsLoadingOverview(false);
      }
    }, []);

  const ask =
    useCallback(
      async (
        question: string,
      ) => {
        const normalizedQuestion =
          question.trim();

        if (
          normalizedQuestion.length <
          3
        ) {
          setAnswerError(
            "Bitte stelle eine konkrete Frage.",
          );

          return;
        }

        setAnswerError(null);
        setIsAnswering(true);

        try {
          const history:
            KnowledgeConversationMessage[] =
            conversation
              .flatMap((turn) => [
                {
                  role:
                    "user" as const,
                  content:
                    turn.question,
                },
                {
                  role:
                    "assistant" as const,
                  content:
                    turn.answer,
                },
              ])
              .slice(-12);

          const nextAnswer =
            await localKnowledgeEngine.askKnowledgeQuestion(
              normalizedQuestion,
              history,
            );

          const nextConversation = [
            ...conversation,
            nextAnswer,
          ];

          setAnswer(
            nextAnswer,
          );

          setConversation(
            nextConversation,
          );
        } catch (error) {
          setAnswerError(
            getErrorMessage(error),
          );
        } finally {
          setIsAnswering(false);
        }
      },
      [conversation],
    );

  const createDocument =
    useCallback(
      async (
        type:
          KnowledgeDocumentType,
        instruction: string,
      ) => {
        setDocumentError(null);
        setIsGeneratingDocument(true);

        try {
          const generatedDocument =
            await localKnowledgeEngine.generateKnowledgeDocument(
              type,
              instruction,
            );

          setDocument(
            generatedDocument,
          );
        } catch (error) {
          setDocumentError(
            getErrorMessage(error),
          );
        } finally {
          setIsGeneratingDocument(
            false,
          );
        }
      },
      [],
    );

  const clearConversation =
    useCallback(() => {
      setAnswer(null);
      setConversation([]);
      setAnswerError(null);

      void localKnowledgeEngine.clearSecondBrainConversation();
    }, []);

  useEffect(() => {
    void loadLocalState();
  }, [loadLocalState]);

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

function getErrorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : "Second Brain ist momentan nicht verfügbar.";
}