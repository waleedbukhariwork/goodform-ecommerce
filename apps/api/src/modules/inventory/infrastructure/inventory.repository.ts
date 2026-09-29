import { Injectable } from "@nestjs/common";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { Database } from "../../../db/database.js";
import {
  inventoryStock,
  reservationItems,
  reservations,
} from "../../../db/schema.js";
import { InsufficientStockError } from "../domain/stock-error.js";

export type ReservationLine = {
  productId: string;
  size: string;
  quantity: number;
};

@Injectable()
export class InventoryRepository {
  constructor(private readonly db: Database) {}

  async reserve(userId: string, lines: ReservationLine[]) {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const ordered = [...lines].sort((a, b) =>
      (a.productId + a.size).localeCompare(b.productId + b.size),
    );
    return this.db.client.transaction(async (tx) => {
      const [group] = await tx
        .insert(reservations)
        .values({ userId, status: "active", expiresAt })
        .returning();
      for (const line of ordered) {
        const updated = await tx
          .update(inventoryStock)
          .set({
            available: sql`${inventoryStock.available} - ${line.quantity}`,
          })
          .where(
            and(
              eq(inventoryStock.productId, line.productId),
              eq(inventoryStock.size, line.size),
              gte(inventoryStock.available, line.quantity),
            ),
          )
          .returning({ id: inventoryStock.id });
        if (!updated.length) throw new InsufficientStockError();
        await tx
          .insert(reservationItems)
          .values({ reservationId: group.id, ...line });
      }
      return group;
    });
  }

  async byOwner(userId: string, id: string) {
    const group = (
      await this.db.client
        .select()
        .from(reservations)
        .where(and(eq(reservations.userId, userId), eq(reservations.id, id)))
        .limit(1)
    )[0];
    if (!group) return null;
    const items = await this.db.client
      .select()
      .from(reservationItems)
      .where(eq(reservationItems.reservationId, id))
      .orderBy(reservationItems.id);
    return { group, items };
  }

  async releaseExpired() {
    return this.db.client.transaction(async (tx) => {
      const expired = await tx
        .update(reservations)
        .set({ status: "released" })
        .where(
          and(
            eq(reservations.status, "active"),
            lte(reservations.expiresAt, new Date()),
          ),
        )
        .returning({ id: reservations.id });
      for (const group of expired) {
        const items = await tx
          .select()
          .from(reservationItems)
          .where(eq(reservationItems.reservationId, group.id));
        for (const item of items) {
          await tx
            .update(inventoryStock)
            .set({
              available: sql`${inventoryStock.available} + ${item.quantity}`,
            })
            .where(
              and(
                eq(inventoryStock.productId, item.productId),
                eq(inventoryStock.size, item.size),
              ),
            );
        }
      }
      return expired.length;
    });
  }
}
