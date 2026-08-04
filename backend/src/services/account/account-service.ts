import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import nodemailer from "nodemailer";

type Account = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  verifiedAt: string | null;
  verificationTokenHash: string | null;
  verificationExpiresAt: string | null;
  sessions: { tokenHash: string; expiresAt: string }[];
  createdAt: string;
  updatedAt: string;
};

const ACCOUNTS_FILE = process.env.ACCOUNT_DATA_PATH
  ? path.resolve(process.env.ACCOUNT_DATA_PATH)
  : path.resolve(process.cwd(), "data", "accounts.json");
const SCRYPT_OPTIONS = { N: 2 ** 15, r: 8, p: 3, maxmem: 128 * 1024 * 1024 };
let writeQueue: Promise<void> = Promise.resolve();

export async function requestAccountVerification(input: {
  username: string;
  email: string;
  oldPassword?: string;
  newPassword: string;
}): Promise<{ developmentVerificationUrl?: string }> {
  const email = normalizeEmail(input.email);
  const accounts = await loadAccounts();
  const existing = accounts.find((account) => account.email === email);
  if (existing && !input.oldPassword) throw new AccountError("OLD_PASSWORD_REQUIRED", 401);
  if (existing && !await verifyPassword(input.oldPassword ?? "", existing)) {
    throw new AccountError("OLD_PASSWORD_INVALID", 401);
  }

  const now = new Date().toISOString();
  const token = randomBytes(32).toString("base64url");
  const password = await hashPassword(input.newPassword);
  const account: Account = existing ?? {
    id: randomBytes(16).toString("hex"),
    username: input.username.trim(),
    email,
    passwordHash: password.hash,
    passwordSalt: password.salt,
    verifiedAt: null,
    verificationTokenHash: null,
    verificationExpiresAt: null,
    sessions: [],
    createdAt: now,
    updatedAt: now,
  };
  Object.assign(account, {
    username: input.username.trim(),
    passwordHash: password.hash,
    passwordSalt: password.salt,
    verifiedAt: null,
    verificationTokenHash: hashToken(token),
    verificationExpiresAt: new Date(Date.now() + 60 * 60 * 1_000).toISOString(),
    sessions: [],
    updatedAt: now,
  });
  if (!existing) accounts.push(account);

  const verificationUrl = `${publicBackendUrl()}/api/account/verify?token=${encodeURIComponent(token)}`;
  await sendVerificationEmail(account.email, account.username, verificationUrl);
  await saveAccounts(accounts);
  return process.env.NODE_ENV === "production" ? {} : { developmentVerificationUrl: verificationUrl };
}

export async function verifyAccountEmail(token: string): Promise<void> {
  const accounts = await loadAccounts();
  const tokenHash = hashToken(token);
  const account = accounts.find((candidate) => candidate.verificationTokenHash === tokenHash);
  if (!account || !account.verificationExpiresAt || new Date(account.verificationExpiresAt).getTime() < Date.now()) {
    throw new AccountError("VERIFICATION_INVALID", 400);
  }
  account.verifiedAt = new Date().toISOString();
  account.verificationTokenHash = null;
  account.verificationExpiresAt = null;
  account.sessions = [];
  account.updatedAt = new Date().toISOString();
  await saveAccounts(accounts);
}

export async function loginAccount(emailInput: string, password: string): Promise<{
  token: string;
  account: { username: string; email: string };
}> {
  const accounts = await loadAccounts();
  const account = accounts.find((candidate) => candidate.email === normalizeEmail(emailInput));
  if (!account || !await verifyPassword(password, account)) throw new AccountError("LOGIN_INVALID", 401);
  if (!account.verifiedAt) throw new AccountError("EMAIL_NOT_VERIFIED", 403);
  const token = randomBytes(32).toString("base64url");
  account.sessions = account.sessions
    .filter((session) => new Date(session.expiresAt).getTime() > Date.now())
    .concat({ tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString() });
  await saveAccounts(accounts);
  return { token, account: { username: account.username, email: account.email } };
}

export async function authenticateAccount(token: string): Promise<Account | null> {
  const tokenHash = hashToken(token);
  const accounts = await loadAccounts();
  return accounts.find((account) => account.verifiedAt && account.sessions.some(
    (session) => session.tokenHash === tokenHash && new Date(session.expiresAt).getTime() > Date.now(),
  )) ?? null;
}

export class AccountError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16).toString("hex");
  const derived = await derivePassword(password, salt, 64);
  return { hash: derived.toString("hex"), salt };
}

async function verifyPassword(password: string, account: Account): Promise<boolean> {
  const expected = Buffer.from(account.passwordHash, "hex");
  const actual = await derivePassword(password, account.passwordSalt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function sendVerificationEmail(email: string, username: string, verificationUrl: string): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  const transporter = smtpUrl
    ? nodemailer.createTransport(smtpUrl)
    : nodemailer.createTransport({ streamTransport: true, newline: "unix", buffer: true });
  if (!smtpUrl && process.env.NODE_ENV === "production") throw new AccountError("EMAIL_NOT_CONFIGURED", 503);
  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? "SaveWise <no-reply@savewise.local>",
    to: email,
    subject: "SaveWise – E-Mail-Adresse bestätigen",
    text: `Hallo ${username},\n\nbestätige deine E-Mail-Adresse über diesen Link:\n${verificationUrl}\n\nDer Link ist 60 Minuten gültig.`,
    html: `<p>Hallo ${escapeHtml(username)},</p><p>Bestätige deine E-Mail-Adresse, um deinen SaveWise-Account zu aktivieren.</p><p><a href="${verificationUrl}">E-Mail-Adresse bestätigen</a></p><p>Der Link ist 60 Minuten gültig.</p>`,
  });
}

function publicBackendUrl(): string {
  return (process.env.PUBLIC_BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 3001}`).replace(/\/$/, "");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function derivePassword(password: string, salt: string, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password.normalize("NFKC"), salt, length, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function loadAccounts(): Promise<Account[]> {
  try {
    const value: unknown = JSON.parse(await fs.readFile(ACCOUNTS_FILE, "utf8"));
    return Array.isArray(value) ? value as Account[] : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

function saveAccounts(accounts: Account[]): Promise<void> {
  const operation = writeQueue.then(async () => {
    await fs.mkdir(path.dirname(ACCOUNTS_FILE), { recursive: true });
    const temporary = `${ACCOUNTS_FILE}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(accounts), "utf8");
    await fs.rename(temporary, ACCOUNTS_FILE);
  });
  writeQueue = operation.catch(() => undefined);
  return operation;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
