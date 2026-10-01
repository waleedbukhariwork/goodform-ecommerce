"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "../../lib/transport";
import { formatMoney } from "../../lib/money";
import { ProductMedia } from "../../components/ui/product-media";
import { publishCartQuantity } from "./cart-count";
import { Failure } from "./error";
import type { Cart } from "./api";

type Reservation = { id: string };
type Checkout = { orderId: string; url: string; status: string };
type Line = Cart["items"][number];

export function CartActions({ cart }: { cart: Cart }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(cart);
  const [shown, setShown] = useState(cart);
  const [pendingLine, setPendingLine] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [errorContext, setErrorContext] = useState<"request" | "checkout">(
    "request",
  );
  useEffect(() => {
    if (!pendingLine && !checkingOut) {
      setConfirmed(cart);
      setShown(cart);
      publishCartQuantity(cart.items);
    }
  }, [cart]);
  useEffect(() => {
    if (!pendingLine && !checkingOut) return;
    const timer = window.setTimeout(() => setSlow(true), 3000);
    return () => window.clearTimeout(timer);
  }, [pendingLine, checkingOut]);
  async function mutate(item: Line, quantity: number) {
    if (pendingLine || checkingOut) return;
    setError(null);
    setErrorContext("request");
    setSlow(false);
    setPendingLine(item.id);
    setShown((previous) => ({
      ...previous,
      items:
        quantity === 0
          ? previous.items.filter((entry) => entry.id !== item.id)
          : previous.items.map((entry) =>
              entry.id === item.id
                ? {
                    ...entry,
                    quantity,
                    lineTotalCents: entry.unitPriceCents * quantity,
                  }
                : entry,
            ),
    }));
    try {
      const fresh =
        quantity === 0
          ? await apiFetch<Cart>(
              `/api/v1/cart/items/${encodeURIComponent(item.id)}`,
              { method: "DELETE" },
            )
          : await apiFetch<Cart>("/api/v1/cart/items", {
              method: "PUT",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                slug: item.slug,
                size: item.size,
                quantity,
              }),
            });
      if (!fresh)
        throw new ApiError(0, "Cart unavailable", crypto.randomUUID());
      setConfirmed(fresh);
      setShown(fresh);
      publishCartQuantity(fresh.items);
      router.refresh();
    } catch (cause) {
      setShown(confirmed);
      setError(cause);
    } finally {
      setPendingLine(null);
      setSlow(false);
    }
  }
  async function checkout() {
    if (pendingLine || checkingOut || !shown.items.length) return;
    setCheckingOut(true);
    setSlow(false);
    setError(null);
    setErrorContext("checkout");
    try {
      const reservation = await apiFetch<Reservation>("/api/v1/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!reservation)
        throw new ApiError(0, "Reservation unavailable", crypto.randomUUID());
      const result = await apiFetch<Checkout>("/api/v1/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ reservationId: reservation.id }),
      });
      if (
        !result ||
        new URL(result.url).origin !== "https://checkout.stripe.com"
      )
        throw new ApiError(0, "Checkout unavailable", crypto.randomUUID());
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause);
      setCheckingOut(false);
      setSlow(false);
    }
  }
  return (
    <>
      <div className="cart-layout">
        <section aria-label="Cart items">
          <div className="cart-items">
            {shown.items.map((item) => (
              <article
                className="cart-item"
                key={item.id}
                aria-busy={pendingLine === item.id}
              >
                <ProductMedia src={item.imagePath} alt="" sizes="104px" />
                <div>
                  <h2>
                    <Link href={`/products/${item.slug}`}>{item.name}</Link>
                  </h2>
                  <p>
                    Size {item.size} · Quantity {item.quantity} ·{" "}
                    {formatMoney(item.unitPriceCents)} each
                  </p>
                  <div className="cart-actions-row">
                    <div
                      className="quantity-stepper"
                      role="group"
                      aria-label={`Quantity for ${item.name}, size ${item.size}`}
                    >
                      <button
                        className="step-button"
                        type="button"
                        aria-label={`Decrease ${item.name} quantity`}
                        disabled={
                          !!pendingLine || checkingOut || item.quantity <= 1
                        }
                        onClick={() => mutate(item, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="quantity-value" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        className="step-button"
                        type="button"
                        aria-label={`Increase ${item.name} quantity`}
                        disabled={
                          !!pendingLine || checkingOut || item.quantity >= 10
                        }
                        onClick={() => mutate(item, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      className="plain-button"
                      type="button"
                      disabled={!!pendingLine || checkingOut}
                      onClick={() => mutate(item, 0)}
                    >
                      Remove
                    </button>
                  </div>
                  {item.quantity >= 10 && <p>Maximum quantity reached.</p>}
                </div>
                <strong>{formatMoney(item.lineTotalCents)}</strong>
              </article>
            ))}
          </div>
          {!shown.items.length && (
            <div className="empty-panel">
              <h2>Your cart is ready for a first piece.</h2>
              <p>Explore the collection and choose a garment to compare.</p>
              <Link className="button" href="/">
                Browse garments
              </Link>
            </div>
          )}
          {pendingLine && (
            <p role="status" className="notice pending-notice">
              Updating your cart. The confirmed total will appear shortly.
              {slow && " Still connecting; your selection is being checked."}
            </p>
          )}
          {error !== null && <Failure error={error} context={errorContext} />}
        </section>
        <aside className="checkout-summary" aria-label="Order summary">
          <h2>Order summary</h2>
          <div className="summary-line">
            <span>{pendingLine ? "Confirming total" : "Total"}</span>
            <strong>
              {formatMoney(
                shown.items.reduce((sum, item) => sum + item.lineTotalCents, 0),
              )}
            </strong>
          </div>
          <p className="reference-note">
            The server confirms every price and checks stock when you continue.
            No payment is taken on this page.
          </p>
          <button
            type="button"
            disabled={!!pendingLine || checkingOut || !shown.items.length}
            onClick={checkout}
          >
            {checkingOut
              ? "Preparing checkout…"
              : "Continue to secure checkout"}
          </button>
          {checkingOut && (
            <p role="status">
              Preparing your reservation and secure payment page.
              {slow &&
                " This is taking longer than usual; please keep this page open."}
            </p>
          )}
          <small>
            Payment is processed in Stripe test mode. Your order is confirmed
            only after the store verifies it.
          </small>
        </aside>
      </div>
    </>
  );
}
