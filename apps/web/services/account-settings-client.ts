import {
  authenticatedFetch,
} from "@/services/account-client";

import type {
  AccountSummary,
} from "@/types/account";

type AccountResponse = {
  account:
    AccountSummary;
};

type ErrorResponse = {
  error?:
    string;
};

export async function changeUsername(
  username:
    string,
): Promise<AccountSummary> {
  const response =
    await authenticatedFetch(
      "/api/account/profile",
      {
        method:
          "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            username,
          }),
      },
    );

  return parseAccountResponse(
    response,
  );
}

export async function changePassword(
  input: {
    currentPassword:
      string;

    newPassword:
      string;
  },
): Promise<AccountSummary> {
  const response =
    await authenticatedFetch(
      "/api/account/password/change",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            input,
          ),
      },
    );

  return parseAccountResponse(
    response,
  );
}

export async function changeEmail(
  input: {
    currentPassword:
      string;

    newEmail:
      string;
  },
): Promise<void> {
  const response =
    await authenticatedFetch(
      "/api/account/email/change",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            input,
          ),
      },
    );

  const body =
    await response
      .json()
      .catch(
        () => ({}),
      ) as ErrorResponse;

  if (!response.ok) {
    throw new Error(
      translateAccountError(
        body.error,
      ),
    );
  }
}

export async function revokeOtherSessions():
Promise<number> {
  const response =
    await authenticatedFetch(
      "/api/account/sessions/revoke-others",
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
      ErrorResponse & {
        revoked?:
          number;
      };

  if (!response.ok) {
    throw new Error(
      translateAccountError(
        body.error,
      ),
    );
  }

  return body.revoked ??
    0;
}

async function parseAccountResponse(
  response:
    Response,
): Promise<AccountSummary> {
  const body =
    await response
      .json()
      .catch(
        () => ({}),
      ) as
      Partial<AccountResponse> &
      ErrorResponse;

  if (
    !response.ok ||
    !body.account
  ) {
    throw new Error(
      translateAccountError(
        body.error,
      ),
    );
  }

  return body.account;
}

function translateAccountError(
  code:
    string | undefined,
): string {
  switch (code) {
    case "CURRENT_PASSWORD_INVALID":
      return "Das aktuelle Passwort ist nicht korrekt.";

    case "PASSWORD_INVALID":
    case "PASSWORD_INPUT_INVALID":
      return "Das neue Passwort muss mindestens 10 Zeichen enthalten.";

    case "USERNAME_INVALID":
      return "Der Benutzername muss zwischen 2 und 80 Zeichen enthalten.";

    case "EMAIL_ALREADY_USED":
      return "Diese E-Mail-Adresse wird bereits verwendet.";

    case "EMAIL_UNCHANGED":
      return "Die neue E-Mail-Adresse entspricht der bisherigen Adresse.";

    case "SESSION_INVALID":
      return "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.";

    case "EMAIL_NOT_CONFIGURED":
      return "Der E-Mail-Versand ist auf dem Server noch nicht konfiguriert.";

    default:
      return code ??
        "Die Kontoänderung ist fehlgeschlagen.";
  }
}
