import "dotenv/config";

import {
  sendAccountVerificationEmail,
} from "../services/mail";

async function main(): Promise<void> {
  const recipientEmail =
    process.argv[2]?.trim();

  if (!recipientEmail) {
    throw new Error(
      [
        "Empfänger fehlt.",
        "",
        "Aufruf:",
        "npx tsx src/scripts/test-resend.ts deine@email.ch",
      ].join("\n"),
    );
  }

  const publicBackendUrl =
    process.env.PUBLIC_BACKEND_URL
      ?.replace(/\/$/, "");

  if (!publicBackendUrl) {
    throw new Error(
      "PUBLIC_BACKEND_URL ist nicht konfiguriert.",
    );
  }

  const result =
    await sendAccountVerificationEmail({
      recipientEmail,

      username:
        "Fernando",

      verificationUrl:
        `${publicBackendUrl}/api/account/verify?token=production-test-token`,
    });

  console.log(
    "Resend-Testmail wurde akzeptiert.",
  );

  console.log(
    `Message-ID: ${result.messageId}`,
  );
}

void main().catch(
  (error: unknown) => {
    console.error(
      "Resend-Test fehlgeschlagen:",
      error,
    );

    process.exitCode = 1;
  },
);
