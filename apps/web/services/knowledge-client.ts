import type {
  KnowledgeAnswer,
  KnowledgeLibrary,
  WorkspaceId,
} from "@savewise/shared";

import {
  authenticatedFetch,
} from "@/services/account-client";

export async function getKnowledgeLibrary(
  workspaceId: WorkspaceId,
): Promise<KnowledgeLibrary> {
  const response =
    await authenticatedFetch(
      `/api/knowledge?workspace=${encodeURIComponent(
        workspaceId,
      )}`,
      {
        method: "GET",
      },
    );

  const body =
    await response
      .json()
      .catch(() => ({})) as
      Partial<KnowledgeLibrary> & {
        error?: string;
      };

  if (!response.ok) {
    throw new Error(
      body.error ??
      "Das Wissensuniversum konnte nicht geladen werden.",
    );
  }

  return body as KnowledgeLibrary;
}

export async function askKnowledge(
  workspaceId: WorkspaceId,
  question: string,
): Promise<KnowledgeAnswer> {
  const response =
    await authenticatedFetch(
      "/api/knowledge/ask",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          workspaceId,
          question,
          history: [],
        }),
      },
    );

  const body =
    await response
      .json()
      .catch(() => ({})) as
      Partial<KnowledgeAnswer> & {
        error?: string;
      };

  if (!response.ok) {
    throw new Error(
      body.error ??
      "Die KI-Analyse konnte nicht durchgeführt werden.",
    );
  }

  return body as KnowledgeAnswer;
}
