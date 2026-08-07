import type {
  ResearchCandidateStatus,
  ResearchState,
} from "@savewise/shared";

import {
  authenticatedFetch,
} from "@/services/account-client";

type ResearchSaveResult = {
  research: ResearchState;
};

async function parseResearchResponse(
  response: Response,
): Promise<ResearchState> {
  const body =
    await response
      .json()
      .catch(() => ({})) as
      Partial<ResearchState> & {
        error?: string;
      };

  if (!response.ok) {
    throw new Error(
      body.error ??
      "Research konnte nicht geladen werden.",
    );
  }

  return body as ResearchState;
}

export async function getResearchState():
Promise<ResearchState> {
  const response =
    await authenticatedFetch(
      "/api/research",
      {
        method: "GET",
      },
    );

  return parseResearchResponse(
    response,
  );
}

export async function runResearch():
Promise<ResearchState> {
  const response =
    await authenticatedFetch(
      "/api/research/run",
      {
        method: "POST",
      },
    );

  return parseResearchResponse(
    response,
  );
}

export async function updateResearchCandidate(
  candidateId: string,
  status: ResearchCandidateStatus,
): Promise<ResearchState> {
  const response =
    await authenticatedFetch(
      `/api/research/candidates/${encodeURIComponent(
        candidateId,
      )}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          status,
        }),
      },
    );

  return parseResearchResponse(
    response,
  );
}

export async function saveResearchCandidate(
  candidateId: string,
): Promise<ResearchState> {
  const response =
    await authenticatedFetch(
      `/api/research/candidates/${encodeURIComponent(
        candidateId,
      )}/save`,
      {
        method: "POST",
      },
    );

  const body =
    await response
      .json()
      .catch(() => ({})) as
      Partial<ResearchSaveResult> & {
        error?: string;
      };

  if (!response.ok) {
    throw new Error(
      body.error ??
      "Der Research-Kandidat konnte nicht gespeichert werden.",
    );
  }

  if (!body.research) {
    throw new Error(
      "Research lieferte keinen aktualisierten Zustand zurück.",
    );
  }

  return body.research;
}
