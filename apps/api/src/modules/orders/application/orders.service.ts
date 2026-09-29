import { Injectable, NotFoundException } from "@nestjs/common";
import {
  TransactionRunner,
  type CommerceTransaction,
} from "../../../db/transaction-runner.js";
import { CartService } from "../../carts/index.js";
import { InventoryService } from "../../inventory/index.js";
import type { OrderStatus } from "../domain/order-status.js";
import { OrdersRepository } from "../infrastructure/orders.repository.js";

@Injectable()
export class OrdersService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly carts: CartService,
    private readonly inventory: InventoryService,
    private readonly repository: OrdersRepository,
  ) {}

  async prepare(ownerId: string, reservationId: string) {
    const id = await this.runner.run(async (transaction) => {
      const cart = await this.carts.linesForCheckout(transaction, ownerId);
      await this.inventory.consumeForCheckout(
        transaction,
        ownerId,
        reservationId,
        cart.lines,
      );
      return this.repository.createPending(
        transaction,
        ownerId,
        reservationId,
        cart,
      );
    });
    return this.detail(ownerId, id);
  }

  async detail(ownerId: string, id: string) {
    const record = await this.repository.byOwner(ownerId, id);
    if (!record) throw new NotFoundException("Order not found");
    return {
      id: record.order.id,
      status: record.order.status,
      totalCents: record.order.totalCents,
      createdAt: record.order.createdAt.toISOString(),
      items: record.lines.map((line) => ({
        slug: line.slug,
        name: line.name,
        imagePath: line.imagePath,
        size: line.size,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.lineTotalCents,
      })),
    };
  }

  transition(
    transaction: CommerceTransaction,
    id: string,
    next: Exclude<OrderStatus, "payment_pending">,
  ) {
    return this.repository.transition(transaction, id, next);
  }
}
