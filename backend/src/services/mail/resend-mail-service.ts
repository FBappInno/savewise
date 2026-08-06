import {
  Resend,
} from "resend";

import type {
  AccountVerificationEmailInput,
  MailDeliveryResult,
} from "./mail-types";

import {
  createAccountVerificationEmail,
} from "./templates/account-verification-email";

let resendClient:
  Resend | null = null;

function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  const apiKey =
    process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new MailConfigurationError(
      "RESEND_API_KEY_NOT_CONFIGURED",
      "RESEND_API_KEY ist nicht konfiguriert.",
    );
  }

  resendClient =
    new Resend(apiKey);

  return resendClient;
}

function getMailFrom(): string {
  const mailFrom =
    process.env.MAIL_FROM?.trim();

  if (!mailFrom) {
    throw new MailConfigurationError(
      "MAIL_FROM_NOT_CONFIGURED",
      "MAIL_FROM ist nicht konfiguriert.",
    );
  }

  return mailFrom;
}

export async function sendAccountVerificationEmail(
  input: AccountVerificationEmailInput,
): Promise<MailDeliveryResult> {
  const resend =
    getResendClient();

  const email =
    createAccountVerificationEmail(
      input,
    );

  const {
    data,
    error,
  } = await resend.emails.send({
    from:
      getMailFrom(),

    to: [
      input.recipientEmail,
    ],

    subject:
      email.subject,

    html:
      email.html,

    text:
      email.text,

    tags: [
      {
        name: "category",
        value:
          "account-verification",
      },
    ],
  });

  if (error) {
    console.error(
      "Resend account verification delivery failed:",
      {
        name:
          error.name,

        message:
          error.message,

        recipient:
          maskEmail(
            input.recipientEmail,
          ),
      },
    );

    throw new MailDeliveryError(
      "VERIFICATION_EMAIL_DELIVERY_FAILED",
      error.message,
    );
  }

  if (!data?.id) {
    throw new MailDeliveryError(
      "VERIFICATION_EMAIL_RESPONSE_INVALID",
      "Resend hat keine Message-ID zurückgegeben.",
    );
  }

  console.info(
    "Account verification email accepted by Resend:",
    {
      messageId:
        data.id,

      recipient:
        maskEmail(
          input.recipientEmail,
        ),
    },
  );

  return {
    messageId:
      data.id,
  };
}

export class MailConfigurationError
  extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);

    this.name =
      "MailConfigurationError";
  }
}

export class MailDeliveryError
  extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);

    this.name =
      "MailDeliveryError";
  }
}

function maskEmail(
  email: string,
): string {
  const [
    localPart,
    domain,
  ] = email.split("@");

  if (
    !localPart ||
    !domain
  ) {
    return "***";
  }

  return `${localPart.slice(
    0,
    2,
  )}***@${domain}`;
}
