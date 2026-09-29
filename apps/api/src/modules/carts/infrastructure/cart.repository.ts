import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { Database } from "../../../db/database.js";
import type { CommerceTransaction } from "../../../db/transaction-runner.js";
import { cartItems } from "../../../db/schema.js";

@Injectable()
export class CartRepository {
  constructor(private readonly db: Database) {}

  list(userId: string, transaction?: CommerceTransaction) {
    return (transaction ?? this.db.client)
      .select()
      .from(cartItems)
      .where(eq(cartItems.userId, userId))
      .orderBy(cartItems.id)
      .limit(21);
  }

  async findVariant(userId: string, productId: string, size: string) {
    return (
      await this.db.client
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.userId, userId),
            eq(cartItems.productId, productId),
            eq(cartItems.size, size),
          ),
        )
        .limit(1)
    )[0];
  }

  async put(userId: string, productId: string, size: string, quantity: number) {
    return (
      await this.db.client
        .insert(cartItems)
        .values({ userId, productId, size, quantity })
        .onConflictDoUpdate({
          target: [cartItems.userId, cartItems.productId, cartItems.size],
          set: { quantity },
        })
        .returning()
    )[0];
  }

  async remove(userId: string, id: string) {
    return this.db.client
      .delete(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.id, id)))
      .returning({ id: cartItems.id });
  }
}
