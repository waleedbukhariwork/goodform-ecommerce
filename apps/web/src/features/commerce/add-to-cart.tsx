"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "../../lib/transport";
import { publishCartQuantity } from "./cart-count";
import { Failure } from "./error";
import type { Cart } from "./api";

const MAX_QUANTITY = 10;

export function AddToCart({ slug, sizes }: { slug: string; sizes: string[] }) {
  const router = useRouter();
  const [size, setSize] = useState(sizes[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [held, setHeld] = useState<Cart | null>(null);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [savedQuantity, setSavedQuantity] = useState<number | null>(null);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => setSlow(true), 3000);
    return () => window.clearTimeout(timer);
  }, [busy]);
  useEffect(() => {
    let cancelled = false;
    apiFetch<Cart>("/api/v1/cart")
      .then((cart) => {
        if (!cancelled && cart) {
          setHeld(cart);
          publishCartQuantity(cart.items);
        }
      })
      .catch(() => {
        if (!cancelled) setHeld(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);
  const already =
    held?.items.find((item) => item.slug === slug && item.size === size)
      ?.quantity ?? 0;
  const room = MAX_QUANTITY - already;
  useEffect(() => {
    setQuantity((value) => (room >= 1 && value > room ? room : value));
  }, [room]);
  async function add() {
    if (busy || !size || quantity < 1 || room < 1) return;
    const adding = Math.min(quantity, room);
    setBusy(true);
    setSlow(false);
    setError(null);
    setSavedQuantity(null);
    try {
      // The cart stores an absolute quantity. Add the selected amount to what
      // is already saved for this size, and let the server price the line.
      const current = await apiFetch<Cart>("/api/v1/cart");
      if (!current)
        throw new ApiError(0, "Cart unavailable", crypto.randomUUID());
      const existing =
        current.items.find((item) => item.slug === slug && item.size === size)
          ?.quantity ?? 0;
      const next = Math.min(MAX_QUANTITY, existing + adding);
      if (next === existing) {
        setHeld(current);
        publishCartQuantity(current.items);
        setSavedQuantity(existing);
        return;
      }
      const cart = await apiFetch<Cart>("/api/v1/cart/items", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, size, quantity: next }),
      });
      if (!cart) throw new ApiError(0, "Cart unavailable", crypto.randomUUID());
      setHeld(cart);
      publishCartQuantity(cart.items);
      setSavedQuantity(
        cart.items.find((item) => item.slug === slug && item.size === size)
          ?.quantity ?? next,
      );
      setQuantity(1);
      router.refresh();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
      setSlow(false);
    }
  }
  return (
    <section className="purchase-panel" aria-label="Purchase options">
      <h2>Choose your size</h2>
      {sizes.length ? (
        <>
          <div className="size-list" role="group" aria-label="Garment size">
            {sizes.map((value) => (
              <button
                type="button"
                className="size-option"
                aria-pressed={size === value}
                key={value}
                onClick={() => {
                  setSize(value);
                  setSavedQuantity(null);
                  setQuantity(1);
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="reference-note" aria-live="polite">
            Size {size} selected.
            {already > 0
              ? ` ${already} already in your cart.`
              : " Stock is checked when your cart is reserved."}
          </p>
          <div className="purchase-row">
            <div className="form-field">
              <span id="product-quantity-label">Quantity to add</span>
              <div
                className="quantity-stepper"
                role="group"
                aria-labelledby="product-quantity-label"
              >
                <button
                  className="step-button"
                  type="button"
                  disabled={quantity <= 1 || busy || room < 1}
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((value) => value - 1)}
                >
                  −
                </button>
                <span className="quantity-value" aria-live="polite">
                  {quantity}
                </span>
                <button
                  className="step-button"
                  type="button"
                  disabled={quantity >= room || busy || room < 1}
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((value) => value + 1)}
                >
                  +
                </button>
              </div>
            </div>
            <button type="button" disabled={busy || room < 1} onClick={add}>
              {busy ? "Adding to cart…" : "Add to cart"}
            </button>
          </div>
          <p className="reference-note">
            {room < 1
              ? "Maximum of 10 for this size is already in your cart."
              : `Adds to this size, up to ${MAX_QUANTITY} in the cart.`}
          </p>
        </>
      ) : (
        <p role="status">No sizes are listed for this garment right now.</p>
      )}
      {busy && (
        <div className="notice pending-notice" role="status">
          <p>
            {quantity} × size {size} is appearing in your cart while we confirm
            it.
          </p>
          {slow && (
            <p>Still connecting. You can keep reading the size chart below.</p>
          )}
        </div>
      )}
      {savedQuantity !== null && (
        <div className="notice success-notice" role="status">
          <p>
            Size {size} is in your cart, quantity {savedQuantity}.{" "}
            <Link href="/cart">Review cart</Link>
          </p>
        </div>
      )}
      {error !== null && (
        <>
          <Failure error={error} />
          {error instanceof ApiError && error.status === 401 && (
            <Link className="back" href="/account">
              Sign in to save a cart
            </Link>
          )}
        </>
      )}
    </section>
  );
}
