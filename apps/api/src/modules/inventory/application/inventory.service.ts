import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CartService } from "../../carts/index.js";
import { InsufficientStockError } from "../domain/stock-error.js";
import { InventoryRepository } from "../infrastructure/inventory.repository.js";

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly carts: CartService,
  ) {}

  async reserveCart(ownerId: string) {
    const lines = await this.carts.linesForReservation(ownerId);
    try {
      const reservation = await this.repository.reserve(ownerId, lines);
      return this.detail(ownerId, reservation.id);
    } catch (error) {
      if (error instanceof InsufficientStockError)
        throw new ConflictException("Insufficient stock");
      throw error;
    }
  }

  async detail(ownerId: string, id: string) {
    const result = await this.repository.byOwner(ownerId, id);
    if (!result) throw new NotFoundException("Reservation not found");
    return {
      id: result.group.id,
      status: result.group.status,
      expiresAt: result.group.expiresAt.toISOString(),
      items: result.items.map((item) => ({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
      })),
    };
  }
}
