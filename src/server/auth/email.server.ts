import nodemailer, { type Transporter } from "nodemailer";

import { getServerEnv } from "../config/env.server";
import { getLogger, toSafeError } from "../observability/logger.server";

type AuthEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (!transporter) {
    const env = getServerEnv();
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
    });
  }
  return transporter;
}

export function queueAuthEmail(message: AuthEmail): void {
  const env = getServerEnv();
  void getTransporter()
    .sendMail({ ...message, from: env.SMTP_FROM })
    .catch((error: unknown) => {
      getLogger().error(
        { error: toSafeError(error), emailType: message.subject },
        "authentication email delivery failed",
      );
    });
}

export function resetEmailTransportForTests(): void {
  transporter = undefined;
}
