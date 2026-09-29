import { Injectable } from "@nestjs/common";
import { and, eq, sql } from "drizzle-orm";
import { Database } from "../../../db/database.js";
import type { CommerceTransaction } from "../../../db/transaction-runner.js";
import {
  checkoutAttempts,
  checkoutRateLimits,
  processedStripeEvents,
} from "../../../db/schema.js";

@Injectable()
export class PaymentsRepository {
  constructor(private readonly db: Database) {}

  async consumeCheckoutLimit(userId: string) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 60_000);
    const [row] = await this.db.client
      .insert(checkoutRateLimits)
      .values({ userId, windowStart: now, count: 1 })
      .onConflictDoUpdate({
        target: checkoutRateLimits.userId,
        set: {
          count: sql`CASE WHEN ${checkoutRateLimits.windowStart} <= ${cutoff} THEN 1 ELSE ${checkoutRateLimits.count} + 1 END`,
          windowStart: sql`CASE WHEN ${checkoutRateLimits.windowStart} <= ${cutoff} THEN ${now} ELSE ${checkoutRateLimits.windowStart} END`,
        },
      })
      .returning({ count: checkoutRateLimits.count });
    return row.count <= 5;
  }

  async reserveKey(
    transaction: CommerceTransaction,
    userId: string,
    key: string,
    reservationId: string,
  ) {
    const [created] = await transaction
      .insert(checkoutAttempts)
      .values({ userId, idempotencyKey: key, reservationId, status: "started" })
      .onConflictDoNothing({
        target: [checkoutAttempts.userId, checkoutAttempts.idempotencyKey],
      })
      .returning();
    if (created) return { created: true as const, attempt: created };
    const [existing] = await transaction
      .select()
      .from(checkoutAttempts)
      .where(
        and(
          eq(checkoutAttempts.userId, userId),
          eq(checkoutAttempts.idempotencyKey, key),
        ),
      )
      .limit(1);
    return { created: false as const, attempt: existing };
  }

  async attachOrder(
    transaction: CommerceTransaction,
    attemptId: string,
    orderId: string,
  ) {
    await transaction
      .update(checkoutAttempts)
      .set({ orderId, updatedAt: new Date() })
      .where(eq(checkoutAttempts.id, attemptId));
  }

  async markReady(attemptId: string, sessionId: string, url: string) {
    await this.db.client
      .update(checkoutAttempts)
      .set({
        stripeSessionId: sessionId,
        checkoutUrl: url,
        status: "ready",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(checkoutAttempts.id, attemptId),
          eq(checkoutAttempts.status, "started"),
        ),
      );
  }

  async markUncertain(attemptId: string) {
    await this.db.client
      .update(checkoutAttempts)
      .set({ status: "uncertain", updatedAt: new Date() })
      .where(
        and(
          eq(checkoutAttempts.id, attemptId),
          eq(checkoutAttempts.status, "started"),
        ),
      );
  }

  async byOrder(transaction: CommerceTransaction, orderId: string) {
    return (
      (
        await transaction
          .select()
          .from(checkoutAttempts)
          .where(eq(checkoutAttempts.orderId, orderId))
          .limit(1)
      )[0] ?? null
    );
  }

  async byOwnerOrder(userId: string, orderId: string) {
    return (
      (
        await this.db.client
          .select()
          .from(checkoutAttempts)
          .where(
            and(
              eq(checkoutAttempts.userId, userId),
              eq(checkoutAttempts.orderId, orderId),
            ),
          )
          .limit(1)
      )[0] ?? null
    );
  }

  async recordEvent(
    transaction: CommerceTransaction,
    id: string,
    type: string,
  ) {
    const rows = await transaction
      .insert(processedStripeEvents)
      .values({ eventId: id, eventType: type })
      .onConflictDoNothing()
      .returning({ id: processedStripeEvents.eventId });
    return rows.length > 0;
  }
}
