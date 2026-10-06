// SMTP sending (ADR-017). Development: Mailpit from docker-compose.yml catches every email.
// Production: any SMTP provider (Resend, Brevo, ...). Recipients and content are never logged.
import nodemailer from "nodemailer";
import { env } from "../config/env";

export interface MailAttachment {
  filename: string;
  path: string;
  /** Referenced from the HTML as src="cid:<cid>". */
  cid: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
}

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(env.email.smtpHost);
}

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: env.email.smtpHost,
      port: env.email.smtpPort,
      secure: env.email.smtpSecure,
      auth: env.email.smtpUser ? { user: env.email.smtpUser, pass: env.email.smtpPass } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transport;
}

export async function sendMail(message: MailMessage): Promise<void> {
  await getTransport().sendMail({
    from: env.email.from,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    attachments: message.attachments,
  });
}
