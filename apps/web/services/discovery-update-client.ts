import type {
  Discovery,
  DiscoveryUpdate,
} from "@savewise/shared";

import {
  authenticatedFetch,
} from "@/services/account-client";

type UpdateResponse = {
  discovery: Discovery;
};

type ErrorResponse = {
  error?: string;
};

export async function updateDiscoveryRequest(
  discoveryId: string,
  update: DiscoveryUpdate,
): Promise<Discovery> {
  const response =
    await authenticatedFetch(
      `/api/discoveries/${encodeURIComponent(
        discoveryId,
      )}`,
      {
        method:
          "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            update,
          ),
      },
    );

  const body =
    await response
      .json()
      .catch(
        () => ({}),
      ) as
      Partial<UpdateResponse> &
      ErrorResponse;

  if (
    !response.ok ||
    !body.discovery
  ) {
    throw new Error(
      body.error ??
      "Die Discovery konnte nicht aktualisiert werden.",
    );
  }

  return body.discovery;
}
