import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import Stripe from "stripe";
import { runtimeConfig } from "../../../config.js";
import {
  TransactionRunner,
  type CommerceTransaction,
} from "../../../db/transaction-runner.js";
import { InventoryService } from "../../inventory/index.js";
import { OrdersService } from "../../orders/index.js";
import { paymentOutcome } from "../domain/payment-outcome.js";
import { PaymentsRepository } from "../infrastructure/payments.repository.js";

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string | undefined;
  private readonly publicOrigin: string;

  constructor(
    @Inject(runtimeConfig.KEY) config: ConfigType<typeof runtimeConfig>,
    private readonly runner: TransactionRunner,
    private readonly repository: PaymentsRepository,
    private readonly orders: OrdersService,
    private readonly inventory: InventoryService,
  ) {
    this.stripe = config.STRIPE_SECRET_KEY
      ? new Stripe(config.STRIPE_SECRET_KEY, {
          maxNetworkRetries: 0,
          timeout: 10_000,
        })
      : null;
    this.webhookSecret = config.STRIPE_WEBHOOK_SECRET;
    this.publicOrigin = config.PUBLIC_ORIGIN!;
  }

  async checkout(ownerId: string, reservationId: string, key: string) {
    if (!this.stripe)
      throw new ServiceUnavailableException(
        "Stripe test checkout is not configured",
      );
    if (!(await this.repository.consumeCheckoutLimit(ownerId)))
      throw new HttpException("Checkout rate limit reached", 429);
    const prepared = await this.runner.run(async (transaction) => {
      const reserved = await this.repository.reserveKey(
        transaction,
        ownerId,
        key,
        reservationId,
      );
      if (!reserved.created)
        return { created: false as const, attempt: reserved.attempt };
      const order = await this.orders.prepareInTransaction(
        transaction,
        ownerId,
        reservationId,
      );
      await this.repository.attachOrder(
        transaction,
        reserved.attempt.id,
        order.id,
      );
      return { created: true as const, attempt: reserved.attempt, order };
    });
    if (!prepared.created) {
      if (prepared.attempt.reservationId !== reservationId)
        throw new ConflictException(
          "Idempotency key belongs to a different checkout",
        );
      if (
        prepared.attempt.status === "ready" &&
        prepared.attempt.orderId &&
        prepared.attempt.checkoutUrl
      )
        return {
          orderId: prepared.attempt.orderId,
          url: prepared.attempt.checkoutUrl,
          status: "payment_pending",
        };
      throw new ConflictException("Checkout is pending reconciliation");
    }
    const { attempt, order } = prepared;
    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.create(
        {
          mode: "payment",
          payment_method_types: ["card"],
          line_items: order.cart.lines.map((line) => ({
            price_data: {
              currency: "usd",
              product_data: { name: `${line.name} / ${line.size}` },
              unit_amount: line.unitPriceCents,
            },
            quantity: line.quantity,
          })),
          client_reference_id: order.id,
          metadata: { orderId: order.id },
          success_url: `${this.publicOrigin}/orders/${order.id}?checkout=return`,
          cancel_url: `${this.publicOrigin}/orders/${order.id}?checkout=cancelled`,
        },
        { idempotencyKey: `goodform-checkout-${attempt.id}` },
      );
    } catch {
      await this.repository.markUncertain(attempt.id);
      throw new ServiceUnavailableException(
        "Checkout initiation needs reconciliation",
      );
    }
    if (
      session.livemode ||
      !session.id.startsWith("cs_test_") ||
      !session.url ||
      new URL(session.url).origin !== "https://checkout.stripe.com"
    ) {
      await this.repository.markUncertain(attempt.id);
      throw new ServiceUnavailableException("Unexpected checkout session");
    }
    await this.repository.markReady(attempt.id, session.id, session.url);
    return { orderId: order.id, url: session.url, status: "payment_pending" };
  }

  verifyWebhook(raw: Buffer, signature: string | undefined) {
    if (!this.webhookSecret)
      throw new ServiceUnavailableException(
        "Webhook verification is not configured",
      );
    if (!signature) throw new BadRequestException("Invalid webhook signature");
    try {
      return Stripe.webhooks.constructEvent(raw, signature, this.webhookSecret);
    } catch {
      throw new BadRequestException("Invalid webhook signature");
    }
  }

  async handleWebhook(event: Stripe.Event) {
    if (
      typeof event.id !== "string" ||
      !event.id.startsWith("evt_") ||
      typeof event.type !== "string"
    )
      throw new BadRequestException("Invalid Stripe event");
    if (event.livemode)
      throw new BadRequestException("Live Stripe events are not accepted");
    const relevant = [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "checkout.session.expired",
    ].includes(event.type);
    if (!relevant) {
      return this.runner.run(async (transaction) => ({
        duplicate: !(await this.repository.recordEvent(
          transaction,
          event.id,
          event.type,
        )),
      }));
    }
    if (!this.stripe)
      throw new ServiceUnavailableException(
        "Provider reconciliation is unavailable",
      );
    const eventSession = event.data.object as Stripe.Checkout.Session;
    if (eventSession.object !== "checkout.session" || !eventSession.id)
      throw new BadRequestException("Invalid checkout event");
    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.retrieve(eventSession.id);
    } catch {
      throw new ServiceUnavailableException("Provider state is unavailable");
    }
    return this.runner.run(async (transaction) => {
      const duplicate = !(await this.repository.recordEvent(
        transaction,
        event.id,
        event.type,
      ));
      if (duplicate) return { duplicate: true };
      await this.applyProviderSession(transaction, session, event.type);
      return { duplicate: false };
    });
  }

  async reconcile(ownerId: string, orderId: string) {
    if (!this.stripe)
      throw new ServiceUnavailableException(
        "Provider reconciliation is unavailable",
      );
    const attempt = await this.repository.byOwnerOrder(ownerId, orderId);
    if (!attempt) throw new NotFoundException("Order not found");
    if (!attempt.stripeSessionId)
      throw new ConflictException(
        "Checkout session needs operator reconciliation",
      );
    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.retrieve(
        attempt.stripeSessionId,
      );
    } catch {
      throw new ServiceUnavailableException("Provider state is unavailable");
    }
    await this.runner.run((transaction) =>
      this.applyProviderSession(transaction, session),
    );
    return this.orders.detail(ownerId, orderId);
  }

  private async applyProviderSession(
    transaction: CommerceTransaction,
    session: Stripe.Checkout.Session,
    eventType?: string,
  ) {
    const orderId = session.client_reference_id;
    if (!orderId || session.livemode || session.currency !== "usd")
      throw new BadRequestException("Checkout session mismatch");
    const order = await this.orders.paymentRecord(transaction, orderId);
    const attempt = await this.repository.byOrder(transaction, orderId);
    if (
      !order ||
      !attempt ||
      session.metadata?.orderId !== orderId ||
      session.amount_total !== order.totalCents ||
      (attempt.stripeSessionId && attempt.stripeSessionId !== session.id)
    )
      throw new BadRequestException("Checkout session mismatch");
    const outcome = paymentOutcome({
      paymentStatus: session.payment_status,
      sessionStatus: session.status,
      eventType,
    });
    if (!outcome) return;
    const transitioned = await this.orders.transition(
      transaction,
      orderId,
      outcome,
    );
    if (!transitioned)
      throw new BadRequestException("Checkout session mismatch");
    if (transitioned.changed && transitioned.status === "paid")
      await this.orders.releasePurchasedCart(
        transaction,
        order.userId,
        orderId,
      );
    if (
      transitioned.status !== "paid" &&
      (outcome === "failed" || outcome === "cancelled")
    )
      await this.inventory.restoreFailedCheckout(
        transaction,
        order.reservationId,
      );
  }
}
