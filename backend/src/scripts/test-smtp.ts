import "dotenv/config";
import nodemailer from "nodemailer";

async function main(): Promise<void> {
  const smtpUrl =
    process.env.SMTP_URL;

  const mailFrom =
    process.env.MAIL_FROM;

  if (!smtpUrl || !mailFrom) {
    throw new Error(
      "SMTP_URL und MAIL_FROM müssen in backend/.env gesetzt sein.",
    );
  }

  const transporter =
    nodemailer.createTransport(
      smtpUrl,
    );

  await transporter.verify();

  console.log(
    "SMTP-Verbindung erfolgreich geprüft.",
  );

  console.log(
    `Absender: ${mailFrom}`,
  );
}

void main().catch((error) => {
  console.error(
    "SMTP-Test fehlgeschlagen:",
    error,
  );

  process.exitCode = 1;
});
