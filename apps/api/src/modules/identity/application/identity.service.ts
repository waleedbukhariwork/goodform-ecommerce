import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "node:http";
import { runtimeConfig } from "../../../config.js";
import { Database } from "../../../db/database.js";
import {
  account,
  rateLimit,
  session,
  user,
  verification,
} from "../../../db/schema.js";
import { accountStateFrom } from "../domain/account-state.js";
import {
  type MailMessage,
  type MailSender,
  ResendMailSender,
  resetMail,
  verificationMail,
} from "../infrastructure/mail.sender.js";
import {
  type MailKind,
  MailCooldownError,
} from "../infrastructure/mail-throttle.js";

async function deliver(mail: MailSender, kind: MailKind, message: MailMessage) {
  try {
    await mail.send(kind, message);
  } catch (error) {
    if (error instanceof MailCooldownError) {
      throw APIError.from("TOO_MANY_REQUESTS", {
        code: "MAIL_COOLDOWN",
        message:
          "You can request one email per minute. Please wait, then try again.",
      });
    }
    throw APIError.from("SERVICE_UNAVAILABLE", {
      code: "MAIL_DELIVERY_FAILED",
      message: "We could not send that email. Please try again in a moment.",
    });
  }
}

function createIdentityAuth(
  db: Database,
  config: ConfigType<typeof runtimeConfig>,
  mail: MailSender,
) {
  if (!config.PUBLIC_ORIGIN) throw new Error("PUBLIC_ORIGIN is required");
  const mailEnforced = config.MAIL_ENABLED === true;
  return betterAuth({
    baseURL: config.PUBLIC_ORIGIN,
    basePath: "/api/auth",
    trustedOrigins: [config.PUBLIC_ORIGIN],
    secret: config.SESSION_SECRET,
    database: drizzleAdapter(db.client, {
      provider: "pg",
      schema: { user, session, account, verification, rateLimit },
    }),
    emailVerification: {
      // Better Auth sends only from this callback. The emailAndPassword hook
      // is not called during signup, which left the verification screen up
      // with no message delivered.
      sendOnSignUp: mailEnforced,
      sendOnSignIn: mailEnforced,
      // The link is a top-level navigation. Creating the session here is what
      // puts the account name in the header after the shopper confirms.
      autoSignInAfterVerification: true,
      sendVerificationEmail: async (payload: {
        user: { email: string };
        url: string;
      }) => {
        await deliver(mail, "verification", {
          ...verificationMail(payload.url),
          to: payload.user.email,
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      // Only enforced where mail is enabled. Dev never enables it. Staging and
      // production enable it only through the release overlay, so a host that
      // cannot send cannot lock a new account out with no recovery.
      requireEmailVerification: mailEnforced,
      autoSignIn: !mailEnforced,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async (payload: {
        user: { email: string };
        url: string;
      }) => {
        await deliver(mail, "reset", {
          ...resetMail(payload.url),
          to: payload.user.email,
        });
      },
    },
    session: { expiresIn: 60 * 60, updateAge: 5 * 60 },
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
        "/forget-password": { window: 60, max: 3 },
        "/request-password-reset": { window: 60, max: 3 },
        "/send-verification-email": { window: 60, max: 3 },
      },
    },
    advanced: {
      defaultCookieAttributes: { sameSite: "lax", path: "/", httpOnly: true },
    },
    logger: { disabled: true },
  });
}

@Injectable()
export class IdentityService {
  readonly auth: ReturnType<typeof createIdentityAuth>;
  readonly publicOrigin: string;

  constructor(
    private readonly db: Database,
    @Inject(runtimeConfig.KEY) config: ConfigType<typeof runtimeConfig>,
    @Inject(ResendMailSender) private readonly mail: MailSender,
  ) {
    if (!config.PUBLIC_ORIGIN) throw new Error("PUBLIC_ORIGIN is required");
    this.publicOrigin = config.PUBLIC_ORIGIN;
    this.auth = createIdentityAuth(db, config, mail);
  }

  async sessionFromHeaders(headers: IncomingHttpHeaders) {
    const current = await this.auth.api.getSession({
      headers: fromNodeHeaders(headers),
    });
    if (!current) return null;
    if (
      Date.now() - new Date(current.session.createdAt).getTime() >
      24 * 60 * 60 * 1000
    ) {
      await this.auth.api.signOut({ headers: fromNodeHeaders(headers) });
      return null;
    }
    return current;
  }

  async revokeFromHeaders(headers: IncomingHttpHeaders) {
    await this.auth.api.signOut({ headers: fromNodeHeaders(headers) });
  }

  private async accountRow(email: string) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return undefined;
    return (
      await this.db.client
        .select({ emailVerified: user.emailVerified })
        .from(user)
        .where(eq(user.email, normalized))
        .limit(1)
    )[0];
  }

  /** True only when this address already belongs to a confirmed account. */
  async verifiedAccountExists(email: string) {
    return (await this.accountRow(email))?.emailVerified === true;
  }

  /** new, verified, or unverified. No name or other account fields. */
  async accountState(email: string) {
    return accountStateFrom(await this.accountRow(email));
  }
}
