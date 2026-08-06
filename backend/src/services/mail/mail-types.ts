export type AccountVerificationEmailInput = {
  recipientEmail: string;
  username: string;
  verificationUrl: string;
};

export type MailDeliveryResult = {
  messageId: string;
};
