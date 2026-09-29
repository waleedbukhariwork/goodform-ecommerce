"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../../lib/transport";
import { Failure } from "./error";
import type { Cart } from "./api";

type Reservation = { id: string };
type Checkout = { orderId: string; url: string; status: string };

export function CartActions({ cart }: { cart: Cart }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch<Cart>("/api/v1/cart/items/" + encodeURIComponent(id), {
        method: "DELETE",
      });
      router.refresh();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const reservation = await apiFetch<Reservation>("/api/v1/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      if (!reservation) throw new Error("Reservation unavailable");
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
        throw new Error("Checkout unavailable");
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause);
      setBusy(false);
    }
  }
  return (
    <>
      <div className="cart-items">
        {cart.items.map((item) => (
          <article className="cart-item" key={item.id}>
            <img src={item.imagePath} alt="" />
            <div>
              <h2>{item.name}</h2>
              <p>
                Size {item.size} · Quantity {item.quantity}
              </p>
              <button
                className="text-button"
                type="button"
                disabled={busy}
                onClick={() => remove(item.id)}
              >
                Remove
              </button>
            </div>
            <strong>${(item.lineTotalCents / 100).toFixed(2)}</strong>
          </article>
        ))}
      </div>
      <div className="checkout-bar">
        <p>
          Total <strong>${(cart.totalCents / 100).toFixed(2)}</strong>
        </p>
        <button
          type="button"
          disabled={busy || !cart.items.length}
          onClick={checkout}
        >
          {busy ? "Preparing checkout…" : "Continue to secure checkout"}
        </button>
      </div>
      {error !== null && <Failure error={error} />}
    </>
  );
}
