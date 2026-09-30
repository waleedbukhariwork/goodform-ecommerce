import { Injectable } from "@nestjs/common";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Database } from "../../../db/database.js";
import type { CommerceTransaction } from "../../../db/transaction-runner.js";
import { orderLines, orders } from "../../../db/schema.js";
import type { CheckoutCart } from "../../carts/index.js";
import {
  transitionOrderStatus,
  type OrderStatus,
} from "../domain/order-status.js";

@Injectable()
export class OrdersRepository {
  constructor(private readonly db: Database) {}

  async createPending(
    transaction: CommerceTransaction,
    userId: string,
    reservationId: string,
    cart: CheckoutCart,
  ) {
    const [order] = await transaction
      .insert(orders)
      .values({
        userId,
        reservationId,
        status: "payment_pending",
        totalCents: cart.totalCents,
      })
      .returning();
    await transaction.insert(orderLines).values(
      cart.lines.map((line) => ({
        orderId: order.id,
        productId: line.productId,
        slug: line.slug,
        name: line.name,
        imagePath: line.imagePath,
        size: line.size,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.lineTotalCents,
      })),
    );
    return order.id;
  }

  async byId(transaction: CommerceTransaction, id: string) {
    return (
      (
        await transaction
          .select()
          .from(orders)
          .where(eq(orders.id, id))
          .limit(1)
      )[0] ?? null
    );
  }

  async listByOwner(userId: string) {
    const rows = await this.db.client
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(50);
    if (!rows.length) return [];
    const lines = await this.db.client
      .select({
        orderId: orderLines.orderId,
        name: orderLines.name,
        size: orderLines.size,
        quantity: orderLines.quantity,
      })
      .from(orderLines)
      .where(
        inArray(
          orderLines.orderId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(orderLines.id);
    const counts = new Map<string, number>();
    const previews = new Map<
      string,
      { name: string; size: string; quantity: number }[]
    >();
    for (const line of lines) {
      counts.set(line.orderId, (counts.get(line.orderId) ?? 0) + line.quantity);
      const preview = previews.get(line.orderId) ?? [];
      preview.push({
        name: line.name,
        size: line.size,
        quantity: line.quantity,
      });
      previews.set(line.orderId, preview);
    }
    return rows.map((order) => ({
      order,
      itemCount: counts.get(order.id) ?? 0,
      lines: previews.get(order.id) ?? [],
    }));
  }

  lines(transaction: CommerceTransaction, orderId: string) {
    return transaction
      .select({
        productId: orderLines.productId,
        size: orderLines.size,
        quantity: orderLines.quantity,
      })
      .from(orderLines)
      .where(eq(orderLines.orderId, orderId));
  }

  async byOwner(userId: string, id: string) {
    const order = (
      await this.db.client
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.userId, userId)))
        .limit(1)
    )[0];
    if (!order) return null;
    const lines = await this.db.client
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, id))
      .orderBy(orderLines.id);
    return { order, lines };
  }

  async transition(
    transaction: CommerceTransaction,
    id: string,
    next: Exclude<OrderStatus, "payment_pending">,
  ) {
    const order = (
      await transaction
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .for("update")
        .limit(1)
    )[0];
    if (!order) return null;
    const status = transitionOrderStatus(order.status as OrderStatus, next);
    const changed = status !== order.status;
    if (changed)
      await transaction
        .update(orders)
        .set({ status, updatedAt: new Date() })
        .where(eq(orders.id, id));
    return { status, changed };
  }
}
