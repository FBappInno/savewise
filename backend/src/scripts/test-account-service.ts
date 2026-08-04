import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("account requires email verification and invalidates the old password", async () => {
  const testDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "savewise-account-test-"));
  process.env.ACCOUNT_DATA_PATH = path.join(testDirectory, "accounts.json");
  process.env.NODE_ENV = "test";
  const {
    AccountError,
    loginAccount,
    requestAccountVerification,
    verifyAccountEmail,
  } = await import("../services/account/account-service");

  try {
  const initial = await requestAccountVerification({
    username: "Beta User",
    email: "beta@example.com",
    newPassword: "initial-password-123",
  });
  assert.ok(initial.developmentVerificationUrl);
  await assert.rejects(
    () => loginAccount("beta@example.com", "initial-password-123"),
    (error: unknown) => error instanceof AccountError && error.code === "EMAIL_NOT_VERIFIED",
  );

  const token = new URL(initial.developmentVerificationUrl!).searchParams.get("token");
  assert.ok(token);
  await verifyAccountEmail(token!);
  const firstLogin = await loginAccount("beta@example.com", "initial-password-123");
  assert.equal(firstLogin.account.username, "Beta User");

  await assert.rejects(
    () => requestAccountVerification({
      username: "Beta User",
      email: "beta@example.com",
      oldPassword: "wrong-password",
      newPassword: "replacement-password-123",
    }),
    (error: unknown) => error instanceof AccountError && error.code === "OLD_PASSWORD_INVALID",
  );

  const changed = await requestAccountVerification({
    username: "Beta User",
    email: "beta@example.com",
    oldPassword: "initial-password-123",
    newPassword: "replacement-password-123",
  });
  const changedToken = new URL(changed.developmentVerificationUrl!).searchParams.get("token");
  await verifyAccountEmail(changedToken!);
  await assert.rejects(() => loginAccount("beta@example.com", "initial-password-123"));
  assert.ok((await loginAccount("beta@example.com", "replacement-password-123")).token);
  } finally {
    await fs.rm(testDirectory, { recursive: true, force: true });
  }
});
