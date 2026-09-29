import { Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { Database } from "../../../db/database.js";
import { mailSendAttempts } from "../../../db/schema.js";

export type MailKind = "verification" | "reset";

/** One send per address per kind per window. */
export const MAIL_COOLDOWN_MS = 60_000;

export class MailCooldownError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("Mail cooldown active");
  }
}

/**
 * Cooldown is enforced here, in the database, rather than in the browser. A
 * client-side timer is cosmetic: a refresh clears it and devtools bypasses it
 * entirely, which leaves a paid provider's quota exposed to abuse.
 */
@Injectable()
export class MailThrottle {
  constructor(private readonly db: Database) {}

  private windowStart(at: Date) {
    return new Date(
      Math.floor(at.getTime() / MAIL_COOLDOWN_MS) * MAIL_COOLDOWN_MS,
    );
  }

  private hash(email: string) {
    // Keyed lookup without storing the address. The secret input is the
    // deployment's own secret, so this is a non-reversible lookup key here
    // rather than a security boundary of its own.
    return createHash("sha256")
      .update(`${this.salt}:${email.trim().toLowerCase()}`)
      .digest("hex");
  }

  private readonly salt = randomBytes(16).toString("base64url");

  /** Claims a slot or throws MailCooldownError with the remaining wait. */
  async claim(kind: MailKind, email: string) {
    const now = new Date();
    const windowStartedAt = this.windowStart(now);
    const emailHash = this.hash(email);
    const inserted = await this.db.client
      .insert(mailSendAttempts)
      .values({ kind, emailHash, windowStartedAt, sentAt: now })
      .onConflictDoNothing({
        target: [
          mailSendAttempts.kind,
          mailSendAttempts.emailHash,
          mailSendAttempts.windowStartedAt,
        ],
      })
      .returning({ id: mailSendAttempts.id });
    if (inserted.length) return;
    const retryAfterMs =
      windowStartedAt.getTime() + MAIL_COOLDOWN_MS - now.getTime();
    throw new MailCooldownError(Math.max(1, Math.ceil(retryAfterMs / 1000)));
  }

  /** Seconds the caller must still wait, or 0 when a send is allowed now. */
  async remaining(kind: MailKind, email: string) {
    const now = new Date();
    const windowStartedAt = this.windowStart(now);
    const [row] = await this.db.client
      .select({ sentAt: mailSendAttempts.sentAt })
      .from(mailSendAttempts)
      .where(
        and(
          eq(mailSendAttempts.kind, kind),
          eq(mailSendAttempts.emailHash, this.hash(email)),
          eq(mailSendAttempts.windowStartedAt, windowStartedAt),
        ),
      )
      .limit(1);
    if (!row) return 0;
    const elapsed = now.getTime() - new Date(row.sentAt).getTime();
    return Math.max(0, Math.ceil((MAIL_COOLDOWN_MS - elapsed) / 1000));
  }

  /** Removes attempts older than the window so the table stays bounded. */
  async prune(before: Date) {
    await this.db.client
      .delete(mailSendAttempts)
      .where(sql`${mailSendAttempts.windowStartedAt} < ${before}`);
  }
}
