import { Inject, Injectable } from "@nestjs/common";
import { Resend } from "resend";
import type { ConfigType } from "@nestjs/config";
import { runtimeConfig } from "../../../config.js";
import { type MailKind, MailThrottle } from "./mail-throttle.js";

/** The SDK exposes no timeout option, so requests are bounded explicitly. */
const MAIL_SEND_TIMEOUT_MS = 8000;

function rejectAfter(ms: number) {
  return new Promise<never>((_resolve, reject) =>
    setTimeout(
      () => reject(new Error("Mail provider timed out")),
      ms,
    ).unref?.(),
  );
}

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * External mail boundary. The interface exists because Resend is a real
 * network dependency, not to decouple classes for its own sake.
 */
export interface MailSender {
  send(kind: MailKind, message: MailMessage): Promise<void>;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Minimal, deliberately plain transactional shell. No image hosts, no tracking
 * pixels and no third-party links, so a verification email exposes nothing
 * beyond the destination address and the action link.
 */
function layout(title: string, body: string, action: string, href: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;background:#f8f9f4;font-family:Arial,Helvetica,sans-serif;color:#17251f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dce3da">
<tr><td style="padding:28px 28px 8px">
<p style="margin:0;font-size:11px;letter-spacing:.15em;color:#5d6c63">GOODFORM</p>
<h1 style="margin:12px 0 0;font-size:20px;line-height:1.3">${escapeHtml(title)}</h1>
</td></tr>
<tr><td style="padding:8px 28px 0;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:20px 28px 0">
<a href="${escapeHtml(href)}" style="display:inline-block;background:#17251f;color:#ffffff;text-decoration:none;padding:14px 22px;font-size:15px">${escapeHtml(action)}</a>
</td></tr>
<tr><td style="padding:16px 28px 28px;font-size:13px;line-height:1.6;color:#5d6c63;word-break:break-all">
<p style="margin:0 0 8px">If the button does not work, copy this link into your browser:</p>
<a href="${escapeHtml(href)}" style="color:#315d45">${escapeHtml(href)}</a>
</td></tr>
</table>
<p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.6;color:#5d6c63">
If you did not request this email you can ignore it. Nothing is sent if you did not ask.
</p>
</body></html>`;
}

@Injectable()
export class ResendMailSender implements MailSender {
  private readonly client: Resend | null;
  private readonly from: string;

  constructor(
    @Inject(runtimeConfig.KEY) config: ConfigType<typeof runtimeConfig>,
    private readonly throttle: MailThrottle,
  ) {
    this.client =
      config.MAIL_ENABLED && config.RESEND_API_KEY
        ? new Resend(config.RESEND_API_KEY)
        : null;
    this.from = config.MAIL_FROM ?? "Goodform <onboarding@resend.dev>";
  }

  async send(kind: MailKind, message: MailMessage) {
    if (!this.client) return;
    // Throttle before the provider call, so a rejected send still consumes the
    // window and cannot be used to probe or hammer the upstream quota.
    await this.throttle.claim(kind, message.to);
    // The SDK accepts neither a timeout nor an AbortSignal, so the send is
    // raced against a local deadline. Without a bound, a stalled provider would
    // hold the signup request open indefinitely.
    const result = await Promise.race([
      this.client.emails.send({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      rejectAfter(MAIL_SEND_TIMEOUT_MS),
    ]);
    // A failed send must surface: silently dropping a verification email would
    // create an account the owner can never activate, with no recovery.
    if (result.error) {
      const status =
        "statusCode" in result.error ? result.error.statusCode : "unknown";
      console.error(
        JSON.stringify({ event: "mail_delivery_failed", status, kind }),
      );
      throw new Error("Mail delivery failed");
    }
  }
}

export function verificationMail(url: string): MailMessage {
  const subject = "Verify your Goodform email";
  return {
    to: "",
    subject,
    text: `Verify your email address to finish creating your Goodform account.\n\nOpen this link to confirm:\n${url}\n\nIf you did not create a Goodform account, ignore this email.`,
    html: layout(
      subject,
      '<p style="margin:0 0 12px">Confirm your email address to finish creating your Goodform account. Your cart and orders stay private to you.</p>',
      "Verify email",
      url,
    ),
  };
}

export function resetMail(url: string): MailMessage {
  const subject = "Reset your Goodform password";
  return {
    to: "",
    subject,
    text: `Somebody asked to reset the password for this Goodform account.\n\nOpen this link to choose a new password:\n${url}\n\nIf this was not you, ignore this email and your password stays unchanged.`,
    html: layout(
      subject,
      '<p style="margin:0 0 12px">Somebody asked to reset the password for this account. If it was you, choose a new password using the button below.</p>',
      "Reset password",
      url,
    ),
  };
}
