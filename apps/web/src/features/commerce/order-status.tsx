"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/transport";
import { Failure } from "./error";
import type { Order } from "./api";

export function OrderStatus({ initial }: { initial: Order }) {
  const [order, setOrder] = useState(initial);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (order.status !== "payment_pending") return;
    const timer = window.setInterval(async () => {
      try {
        const fresh = await apiFetch<Order>(
          "/api/v1/orders/" + encodeURIComponent(order.id),
        );
        if (fresh) {
          setOrder(fresh);
          setError(null);
        }
      } catch (cause) {
        setError(cause);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [order.id, order.status]);
  async function reconcile() {
    setBusy(true);
    setError(null);
    try {
      const fresh = await apiFetch<Order>(
        "/api/v1/orders/" + encodeURIComponent(order.id) + "/reconcile",
        { method: "POST" },
      );
      if (fresh) setOrder(fresh);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  const label =
    order.status === "paid"
      ? "Payment confirmed"
      : order.status === "payment_pending"
        ? "Payment processing"
        : order.status === "failed"
          ? "Payment failed"
          : "Checkout cancelled";
  return (
    <>
      <div className="notice" role="status">
        <h2>{label}</h2>
        <p>
          {order.status === "payment_pending"
            ? "We are waiting for confirmation from the payment provider. This page checks the server for updates."
            : order.status === "paid"
              ? "Your order is confirmed."
              : "Your order was not paid."}
        </p>
      </div>
      <p>Order reference: {order.id}</p>
      <div className="cart-items">
        {order.items.map((item) => (
          <article className="cart-item" key={`${item.slug}-${item.size}`}>
            <img src={item.imagePath} alt="" />
            <div>
              <h3>{item.name}</h3>
              <p>
                Size {item.size} · Quantity {item.quantity}
              </p>
            </div>
            <strong>${(item.lineTotalCents / 100).toFixed(2)}</strong>
          </article>
        ))}
      </div>
      <p className="order-total">
        Total: ${(order.totalCents / 100).toFixed(2)}
      </p>
      {order.status === "payment_pending" && (
        <button type="button" disabled={busy} onClick={reconcile}>
          {busy ? "Checking…" : "Check payment status"}
        </button>
      )}
      {error !== null && <Failure error={error} />}
    </>
  );
}
