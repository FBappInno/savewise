import type {
  AccountSession,
  AccountSummary,
} from "@/types/account";

const SESSION_STORAGE_KEY =
  "savewise.web.account-session.v1";

type LoginResponse = {
  token: string;
  account: AccountSummary;
};

type SessionResponse = {
  account: AccountSummary;
};

type ApiErrorResponse = {
  error?: string;
};

export async function loginAccount(
  email: string,
  password: string,
): Promise<AccountSession> {
  const response =
    await fetch(
      createApiUrl(
        "/api/account/login",
      ),
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            email:
              email.trim(),

            password,
          }),
      },
    );

  const body =
    await readJson<
      LoginResponse &
      ApiErrorResponse
    >(response);

  if (
    !response.ok ||
    !body.token ||
    !body.account
  ) {
    throw new Error(
      translateAccountError(
        body.error,
      ),
    );
  }

  const session:
  AccountSession = {
    token:
      body.token,

    account:
      body.account,
  };

  saveStoredAccountSession(
    session,
  );

  return session;
}

export async function validateAccountSession(
  token: string,
): Promise<AccountSummary | null> {
  const response =
    await fetch(
      createApiUrl(
        "/api/account/session",
      ),
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  if (
    response.status === 401
  ) {
    return null;
  }

  const body =
    await readJson<
      SessionResponse &
      ApiErrorResponse
    >(response);

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

export function loadStoredAccountSession():
AccountSession | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const stored =
    window.sessionStorage.getItem(
      SESSION_STORAGE_KEY,
    );

  if (!stored) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(
        stored,
      ) as Partial<AccountSession>;

    if (
      typeof parsed.token !==
        "string" ||
      !parsed.account ||
      typeof parsed.account
        .username !==
        "string" ||
      typeof parsed.account
        .email !==
        "string"
    ) {
      return null;
    }

    return {
      token:
        parsed.token,

      account: {
        username:
          parsed.account
            .username,

        email:
          parsed.account
            .email,
      },
    };
  } catch {
    return null;
  }
}

export function saveStoredAccountSession(
  session: AccountSession,
): void {
  window.sessionStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(
      session,
    ),
  );
}

export function deleteStoredAccountSession():
void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.sessionStorage.removeItem(
    SESSION_STORAGE_KEY,
  );
}

export function getStoredAccountToken():
string | null {
  return (
    loadStoredAccountSession()
      ?.token ??
    null
  );
}

export async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token =
    getStoredAccountToken();

  if (!token) {
    throw new Error(
      "SAVEWISE_SESSION_REQUIRED",
    );
  }

  return fetch(
    createApiUrl(path),
    {
      ...options,

      headers: {
        Accept:
          "application/json",

        Authorization:
          `Bearer ${token}`,

        ...options.headers,
      },
    },
  );
}

function createApiUrl(
  path: string,
): string {
  const apiUrl =
    process.env
      .NEXT_PUBLIC_API_URL
      ?.trim()
      .replace(
        /\/+$/,
        "",
      );

  if (!apiUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL fehlt.",
    );
  }

  return `${apiUrl}${path}`;
}

async function readJson<T>(
  response: Response,
): Promise<Partial<T>> {
  return response
    .json()
    .catch(
      () => ({}),
    ) as Promise<
      Partial<T>
    >;
}

function translateAccountError(
  code?: string,
): string {
  switch (code) {
    case "LOGIN_INVALID":
      return "E-Mail-Adresse oder Passwort ist falsch.";

    case "EMAIL_NOT_VERIFIED":
      return "Bestätige zuerst deine E-Mail-Adresse.";

    case "SESSION_INVALID":
      return "Deine Anmeldung ist abgelaufen.";

    case "LOGIN_INPUT_INVALID":
      return "Prüfe deine Eingaben.";

    default:
      return "Die Anmeldung ist derzeit nicht möglich.";
  }
}
