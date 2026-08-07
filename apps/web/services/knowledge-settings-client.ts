import type {
  KnowledgeLibrary,
} from "@savewise/shared";

import {
  authenticatedFetch,
} from "@/services/account-client";

type RebuildResponse = {
  message:
    string;

  library:
    KnowledgeLibrary;
};

export async function rebuildKnowledgeUniverse():
Promise<RebuildResponse> {
  const response =
    await authenticatedFetch(
      "/api/knowledge/rebuild",
      {
        method:
          "POST",
      },
    );

  const body =
    await response
      .json()
      .catch(
        () => ({}),
      ) as
      Partial<RebuildResponse> & {
        error?:
          string;
      };

  if (
    !response.ok ||
    !body.library
  ) {
    throw new Error(
      body.error ??
      "Das Wissensuniversum konnte nicht optimiert werden.",
    );
  }

  return {
    message:
      body.message ??
      "Knowledge universe rebuilt.",

    library:
      body.library,
  };
}
