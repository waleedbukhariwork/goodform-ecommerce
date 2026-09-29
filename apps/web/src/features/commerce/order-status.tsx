"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/transport";
import { formatMoney } from "../../lib/money";
import { ProductMedia } from "../../components/ui/product-media";
import { Failure } from "./error";
import type { Order } from "./api";

export function OrderStatus({ initial }: { initial: Order }) {
  const [order, setOrder] = useState(initial);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (order.status !== "payment_pending") return;
    const timer = window.setInterval(async () => {
      try {
        const fresh = await apiFetch<Order>(
          `/api/v1/orders/${encodeURIComponent(order.id)}`,
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
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => setSlow(true), 3000);
    return () => window.clearTimeout(timer);
  }, [busy]);
  async function reconcile() {
    if (busy) return;
    setBusy(true);
    setSlow(false);
    setError(null);
    try {
      const fresh = await apiFetch<Order>(
        `/api/v1/orders/${encodeURIComponent(order.id)}/reconcile`,
        { method: "POST" },
      );
      if (fresh) setOrder(fresh);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
      setSlow(false);
    }
  }
  const label =
    order.status === "paid"
      ? "Payment confirmed"
      : order.status === "payment_pending"
        ? "Waiting for payment confirmation"
        : order.status === "failed"
          ? "Payment failed"
          : "Checkout cancelled";
  const message =
    order.status === "paid"
      ? "Your order is confirmed by the store."
      : order.status === "payment_pending"
        ? "Your checkout has been received. We are checking the server for payment confirmation; you can leave this page and return later."
        : "This order was not paid. Your account remains available, and you can review your cart.";
  return (
    <>
      <div
        className={`notice ${order.status === "paid" ? "success-notice" : order.status === "payment_pending" ? "pending-notice" : "error-notice"}`}
        role="status"
        aria-live="polite"
      >
        <h2>{label}</h2>
        <p>{message}</p>
      </div>
      <p className="order-reference">Order reference: {order.id}</p>
      <section aria-label="Order items" className="cart-items">
        {order.items.map((item) => (
          <article className="cart-item" key={`${item.slug}-${item.size}`}>
            <ProductMedia src={item.imagePath} alt="" sizes="104px" />
            <div>
              <h3>{item.name}</h3>
              <p>
                Size {item.size} · Quantity {item.quantity}
              </p>
            </div>
            <strong>{formatMoney(item.lineTotalCents)}</strong>
          </article>
        ))}
      </section>
      <p className="order-total">
        <span>Order total</span>
        <strong>{formatMoney(order.totalCents)}</strong>
      </p>
      {order.status === "payment_pending" && (
        <>
          <button type="button" disabled={busy} onClick={reconcile}>
            {busy ? "Checking…" : "Check payment status"}
          </button>
          <p className="reference-note" role="status">
            {busy
              ? slow
                ? "Still checking the server. Your order has not been marked paid yet."
                : "Checking the server…"
              : "This page also checks automatically every few seconds."}
          </p>
        </>
      )}
      {error !== null && <Failure error={error} />}
    </>
  );
}
