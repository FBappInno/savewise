import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

import { runtimeConfig } from "../../config/runtime-config";

import {
  MailConfigurationError,
  MailDeliveryError,
  sendAccountVerificationEmail,
} from "../mail";
import { storagePaths } from "../../config/storage-paths";
import {
  readJsonFile,
  writeJsonFile,
} from "../../persistence/shared/json-file-store";

type AccountSession = {
  tokenHash: string;
  expiresAt: string;
};

export type Account = {
  id: string;

  username: string;

  email: string;

  passwordHash: string;

  passwordSalt: string;

  verifiedAt: string | null;

  verificationTokenHash:
    | string
    | null;

  verificationExpiresAt:
    | string
    | null;

  sessions: AccountSession[];

  createdAt: string;

  updatedAt: string;
};

type AccountSummary = {
  username: string;

  email: string;
};

const SCRYPT_OPTIONS = {
  N: 2 ** 15,

  r: 8,

  p: 3,

  maxmem:
    128 *
    1024 *
    1024,
} as const;

const VERIFICATION_TTL_MS =
  60 *
  60 *
  1_000;

const SESSION_TTL_MS =
  30 *
  24 *
  60 *
  60 *
  1_000;

export async function requestAccountVerification(
  input: {
    username: string;

    email: string;

    oldPassword?: string;

    newPassword: string;
  },
): Promise<{
  developmentVerificationUrl?: string;
}> {
  const email =
    normalizeEmail(
      input.email,
    );

  const username =
    input.username.trim();

  const accounts =
    await loadAccounts();

  const existing =
    accounts.find(
      (account) =>
        account.email ===
        email,
    );

  if (
    existing &&
    !input.oldPassword
  ) {
    throw new AccountError(
      "OLD_PASSWORD_REQUIRED",
      401,
    );
  }

  if (
    existing &&
    !await verifyPassword(
      input.oldPassword ?? "",
      existing,
    )
  ) {
    throw new AccountError(
      "OLD_PASSWORD_INVALID",
      401,
    );
  }

  const now =
    new Date().toISOString();

  const token =
    randomBytes(32)
      .toString("base64url");

  const password =
    await hashPassword(
      input.newPassword,
    );

  const account:
    Account =
    existing ?? {
      id:
        randomBytes(16)
          .toString("hex"),

      username,

      email,

      passwordHash:
        password.hash,

      passwordSalt:
        password.salt,

      verifiedAt: null,

      verificationTokenHash:
        null,

      verificationExpiresAt:
        null,

      sessions: [],

      createdAt:
        now,

      updatedAt:
        now,
    };

  account.username =
    username;

  account.email =
    email;

  account.passwordHash =
    password.hash;

  account.passwordSalt =
    password.salt;

  account.verifiedAt =
    null;

  account.verificationTokenHash =
    hashToken(token);

  account.verificationExpiresAt =
    new Date(
      Date.now() +
      VERIFICATION_TTL_MS,
    ).toISOString();

  account.sessions =
    [];

  account.updatedAt =
    now;

  if (!existing) {
    accounts.push(
      account,
    );
  }

  const verificationUrl =
    createVerificationUrl(
      token,
    );

  await deliverVerificationEmail({
    email:
      account.email,

    username:
      account.username,

    verificationUrl,
  });

  await saveAccounts(
    accounts,
  );

  return runtimeConfig.isProduction
    ? {}
    : {
        developmentVerificationUrl:
          verificationUrl,
      };
}

export async function verifyAccountEmail(
  token: string,
): Promise<void> {
  const accounts =
    await loadAccounts();

  const tokenHash =
    hashToken(token);

  const account =
    accounts.find(
      (candidate) =>
        candidate
          .verificationTokenHash ===
        tokenHash,
    );

  if (
    !account ||
    !account
      .verificationExpiresAt ||
    new Date(
      account
        .verificationExpiresAt,
    ).getTime() <
      Date.now()
  ) {
    throw new AccountError(
      "VERIFICATION_INVALID",
      400,
    );
  }

  account.verifiedAt =
    new Date().toISOString();

  account.verificationTokenHash =
    null;

  account.verificationExpiresAt =
    null;

  account.sessions =
    [];

  account.updatedAt =
    new Date().toISOString();

  await saveAccounts(
    accounts,
  );
}

export async function loginAccount(
  emailInput: string,
  password: string,
): Promise<{
  token: string;

  account: AccountSummary;
}> {
  const accounts =
    await loadAccounts();

  const email =
    normalizeEmail(
      emailInput,
    );

  const account =
    accounts.find(
      (candidate) =>
        candidate.email ===
        email,
    );

  if (
    !account ||
    !await verifyPassword(
      password,
      account,
    )
  ) {
    throw new AccountError(
      "LOGIN_INVALID",
      401,
    );
  }

  if (!account.verifiedAt) {
    throw new AccountError(
      "EMAIL_NOT_VERIFIED",
      403,
    );
  }

  const token =
    randomBytes(32)
      .toString("base64url");

  const now =
    Date.now();

  account.sessions =
    account.sessions
      .filter(
        (session) =>
          new Date(
            session.expiresAt,
          ).getTime() >
          now,
      )
      .concat({
        tokenHash:
          hashToken(token),

        expiresAt:
          new Date(
            now +
            SESSION_TTL_MS,
          ).toISOString(),
      });

  account.updatedAt =
    new Date(now)
      .toISOString();

  await saveAccounts(
    accounts,
  );

  return {
    token,

    account: {
      username:
        account.username,

      email:
        account.email,
    },
  };
}

export async function authenticateAccount(
  token: string,
): Promise<Account | null> {
  if (!token.trim()) {
    return null;
  }

  const tokenHash =
    hashToken(token);

  const accounts =
    await loadAccounts();

  const now =
    Date.now();

  return (
    accounts.find(
      (account) =>
        Boolean(
          account.verifiedAt,
        ) &&
        account.sessions.some(
          (session) =>
            session.tokenHash ===
              tokenHash &&
            new Date(
              session.expiresAt,
            ).getTime() >
              now,
        ),
    ) ??
    null
  );
}

export class AccountError
  extends Error {
  constructor(
    public readonly code: string,

    public readonly status: number,
  ) {
    super(code);

    this.name =
      "AccountError";
  }
}

async function hashPassword(
  password: string,
): Promise<{
  hash: string;

  salt: string;
}> {
  const salt =
    randomBytes(16)
      .toString("hex");

  const derived =
    await derivePassword(
      password,
      salt,
      64,
    );

  return {
    hash:
      derived.toString(
        "hex",
      ),

    salt,
  };
}

async function verifyPassword(
  password: string,
  account: Account,
): Promise<boolean> {
  try {
    const expected =
      Buffer.from(
        account.passwordHash,
        "hex",
      );

    if (
      expected.length ===
      0
    ) {
      return false;
    }

    const actual =
      await derivePassword(
        password,
        account.passwordSalt,
        expected.length,
      );

    return (
      expected.length ===
        actual.length &&
      timingSafeEqual(
        expected,
        actual,
      )
    );
  } catch {
    return false;
  }
}

function derivePassword(
  password: string,
  salt: string,
  length: number,
): Promise<Buffer> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      scryptCallback(
        password.normalize(
          "NFKC",
        ),

        salt,

        length,

        SCRYPT_OPTIONS,

        (
          error,
          derivedKey,
        ) => {
          if (error) {
            reject(error);

            return;
          }

          resolve(
            derivedKey,
          );
        },
      );
    },
  );
}

async function deliverVerificationEmail(
  input: {
    email: string;

    username: string;

    verificationUrl: string;
  },
): Promise<void> {
  try {
    await sendAccountVerificationEmail({
      recipientEmail:
        input.email,

      username:
        input.username,

      verificationUrl:
        input.verificationUrl,
    });
  } catch (error) {
    if (
      error instanceof
        MailConfigurationError
    ) {
      console.error(
        "Account verification mail is not configured:",
        {
          code: error.code,
          message: error.message,
        },
      );

      throw new AccountError(
        "EMAIL_NOT_CONFIGURED",
        503,
      );
    }

    if (
      error instanceof
        MailDeliveryError
    ) {
      console.error(
        "Account verification mail delivery failed:",
        {
          code: error.code,
          message: error.message,
        },
      );

      throw new AccountError(
        "EMAIL_DELIVERY_FAILED",
        502,
      );
    }

    console.error(
      "Unexpected account verification mail error:",
      error,
    );

    throw new AccountError(
      "EMAIL_DELIVERY_FAILED",
      502,
    );
  }
}

function createVerificationUrl(
  token: string,
): string {
  return [
    runtimeConfig
      .publicBackendUrl,

    "/api/account/verify?token=",

    encodeURIComponent(
      token,
    ),
  ].join("");
}

function normalizeEmail(
  email: string,
): string {
  return email
    .trim()
    .toLocaleLowerCase();
}

function hashToken(
  token: string,
): string {
  return createHash(
    "sha256",
  )
    .update(token)
    .digest("hex");
}

async function loadAccounts(): Promise<
  Account[]
> {
  return readJsonFile(
    storagePaths.accounts,

    () => [],

    isAccountArray,
  );
}

async function saveAccounts(
  accounts: Account[],
): Promise<void> {
  await writeJsonFile(
    storagePaths.accounts,
    accounts,
    false,
  );
}

function isAccountArray(
  value: unknown,
): value is Account[] {
  return (
    Array.isArray(value) &&
    value.every(
      isAccount,
    )
  );
}

function isAccount(
  value: unknown,
): value is Account {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const account =
    value as Partial<Account>;

  return (
    typeof account.id ===
      "string" &&
    typeof account.username ===
      "string" &&
    typeof account.email ===
      "string" &&
    typeof account.passwordHash ===
      "string" &&
    typeof account.passwordSalt ===
      "string" &&
    (
      account.verifiedAt ===
        null ||
      typeof account.verifiedAt ===
        "string"
    ) &&
    (
      account
        .verificationTokenHash ===
        null ||
      typeof account
        .verificationTokenHash ===
        "string"
    ) &&
    (
      account
        .verificationExpiresAt ===
        null ||
      typeof account
        .verificationExpiresAt ===
        "string"
    ) &&
    Array.isArray(
      account.sessions,
    ) &&
    account.sessions.every(
      isAccountSession,
    ) &&
    typeof account.createdAt ===
      "string" &&
    typeof account.updatedAt ===
      "string"
  );
}

function isAccountSession(
  value: unknown,
): value is AccountSession {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return false;
  }

  const session =
    value as Partial<AccountSession>;

  return (
    typeof session.tokenHash ===
      "string" &&
    typeof session.expiresAt ===
      "string"
  );
}
