import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CommerceTransaction } from "../../../db/transaction-runner.js";
import type { CheckoutCart } from "../carts.types.js";
import { CatalogService } from "../../catalog/index.js";
import {
  calculateLine,
  calculateTotal,
  MAX_CART_LINES,
} from "../domain/cart-totals.js";
import { CartRepository } from "../infrastructure/cart.repository.js";

@Injectable()
export class CartService {
  constructor(
    private readonly repository: CartRepository,
    private readonly catalog: CatalogService,
  ) {}

  async view(ownerId: string) {
    const stored = await this.repository.list(ownerId);
    const items = await Promise.all(
      stored.map(async (item) => {
        const product = await this.catalog.snapshotById(item.productId);
        return {
          id: item.id,
          slug: product.slug,
          name: product.name,
          imagePath: product.imagePath,
          size: item.size,
          quantity: item.quantity,
          unitPriceCents: product.priceCents,
          lineTotalCents: calculateLine(product.priceCents, item.quantity),
        };
      }),
    );
    return { items, totalCents: calculateTotal(items) };
  }

  async put(ownerId: string, slug: string, size: string, quantity: number) {
    const product = await this.catalog.snapshotBySlug(slug);
    if (!product.sizes.includes(size))
      throw new BadRequestException("Unknown size");
    const existing = await this.repository.findVariant(
      ownerId,
      product.id,
      size,
    );
    if (
      !existing &&
      (await this.repository.list(ownerId)).length >= MAX_CART_LINES
    )
      throw new ConflictException("Cart item limit reached");
    await this.repository.put(ownerId, product.id, size, quantity);
    return this.view(ownerId);
  }

  async remove(ownerId: string, id: string) {
    if (!(await this.repository.remove(ownerId, id)).length)
      throw new NotFoundException("Cart item not found");
    return this.view(ownerId);
  }

  async linesForCheckout(
    transaction: CommerceTransaction,
    ownerId: string,
  ): Promise<CheckoutCart> {
    const stored = await this.repository.list(ownerId, transaction);
    if (!stored.length) throw new BadRequestException("Cart is empty");
    const lines = await Promise.all(
      stored.map(async (item) => {
        const product = await this.catalog.snapshotById(
          item.productId,
          transaction,
        );
        if (!product.sizes.includes(item.size))
          throw new ConflictException("Variant unavailable");
        return {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          imagePath: product.imagePath,
          size: item.size,
          quantity: item.quantity,
          unitPriceCents: product.priceCents,
          lineTotalCents: calculateLine(product.priceCents, item.quantity),
        };
      }),
    );
    return { lines, totalCents: calculateTotal(lines) };
  }

  async linesForReservation(ownerId: string) {
    const cart = await this.view(ownerId);
    if (!cart.items.length) throw new BadRequestException("Cart is empty");
    return Promise.all(
      cart.items.map(async (item) => {
        const product = await this.catalog.snapshotBySlug(item.slug);
        return {
          productId: product.id,
          size: item.size,
          quantity: item.quantity,
        };
      }),
    );
  }
}
