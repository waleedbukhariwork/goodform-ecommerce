import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
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
import {
  type MailSender,
  ResendMailSender,
  resetMail,
  verificationMail,
} from "../infrastructure/mail.sender.js";

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
    emailAndPassword: {
      enabled: true,
      // Only enforced where mail actually delivers. Requiring verification
      // without a working send path would lock every new account out with no
      // recovery, so dev and staging keep the frictionless path.
      requireEmailVerification: mailEnforced,
      autoSignIn: !mailEnforced,
      sendVerificationEmail: async (payload: {
        user: { email: string };
        url: string;
      }) => {
        await mail.send("verification", {
          ...verificationMail(payload.url),
          to: payload.user.email,
        });
      },
      sendResetPassword: async (payload: {
        user: { email: string };
        url: string;
      }) => {
        await mail.send("reset", {
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
    db: Database,
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
}
