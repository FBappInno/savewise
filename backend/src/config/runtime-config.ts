import path from "node:path";

function normalizeEnvironment(
  value: string | undefined,
): "development" | "test" | "production" {
  if (value === "production") {
    return "production";
  }

  if (value === "test") {
    return "test";
  }

  return "development";
}

function parsePort(
  value: string | undefined,
): number {
  const parsedPort = Number(
    value ?? 3001,
  );

  if (
    !Number.isInteger(parsedPort) ||
    parsedPort <= 0 ||
    parsedPort > 65_535
  ) {
    throw new Error(
      `Invalid PORT value: ${value ?? ""}`,
    );
  }

  return parsedPort;
}

function resolveDataDirectory(): string {
  const configuredDirectory =
    process.env.SAVEWISE_DATA_DIRECTORY?.trim();

  if (configuredDirectory) {
    return path.resolve(
      configuredDirectory,
    );
  }

  return path.resolve(
    process.cwd(),
    "data",
  );
}

function normalizePublicBackendUrl(
  value: string | undefined,
  port: number,
): string {
  const fallback =
    `http://localhost:${port}`;

  return (
    value?.trim() ||
    fallback
  ).replace(/\/+$/, "");
}

const nodeEnvironment =
  normalizeEnvironment(
    process.env.NODE_ENV,
  );

const port =
  parsePort(
    process.env.PORT,
  );

const dataDirectory =
  resolveDataDirectory();

export const runtimeConfig = {
  nodeEnvironment,

  isDevelopment:
    nodeEnvironment ===
    "development",

  isTest:
    nodeEnvironment ===
    "test",

  isProduction:
    nodeEnvironment ===
    "production",

  port,

  dataDirectory,

  publicBackendUrl:
    normalizePublicBackendUrl(
      process.env.PUBLIC_BACKEND_URL,
      port,
    ),

  openAiApiKey:
    process.env.OPENAI_API_KEY?.trim() ??
    "",

  mailFrom:
    process.env.MAIL_FROM?.trim() ||
    "SaveWise <no-reply@savewise.local>",

  corsOrigin:
    process.env.CORS_ORIGIN?.trim() ||
    "*",

  dropboxAppKey:
    process.env.DROPBOX_APP_KEY?.trim() ??
    "",

  dropboxAppSecret:
    process.env.DROPBOX_APP_SECRET?.trim() ??
    "",

  dropboxRedirectUri:
    process.env.DROPBOX_REDIRECT_URI?.trim() ??
    "",

  dropboxTokenEncryptionKey:
    process.env.DROPBOX_TOKEN_ENCRYPTION_KEY?.trim() ??
    "",

  mobileAppUrl:
    process.env.MOBILE_APP_URL?.trim() ||
    "savewise://oauth/dropbox",
} as const;
