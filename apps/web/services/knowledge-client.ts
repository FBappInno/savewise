import type {
  KnowledgeLibrary,
  WorkspaceId,
} from "@savewise/shared";

import {
  authenticatedFetch,
} from "@/services/account-client";

export async function getKnowledgeLibrary(
  workspaceId:
    WorkspaceId,
): Promise<KnowledgeLibrary> {
  const response =
    await authenticatedFetch(
      `/api/knowledge?workspace=${encodeURIComponent(
        workspaceId,
      )}`,
      {
        method:
          "GET",
      },
    );

  const body =
    await response
      .json()
      .catch(
        () => ({}),
      ) as
      Partial<
        KnowledgeLibrary
      > & {
        error?:
          string;
      };

  if (
    !response.ok
  ) {
    throw new Error(
      body.error ??
      "Das Wissensuniversum konnte nicht geladen werden.",
    );
  }

  return body as
    KnowledgeLibrary;
}
