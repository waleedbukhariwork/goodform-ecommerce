"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "../../lib/transport";
import { Failure } from "./error";
import type { Cart } from "./api";

export function AddToCart({ slug, sizes }: { slug: string; sizes: string[] }) {
  const router = useRouter();
  const [size, setSize] = useState(sizes[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => setSlow(true), 3000);
    return () => window.clearTimeout(timer);
  }, [busy]);
  async function add() {
    if (busy || !size || quantity < 1 || quantity > 10) return;
    setBusy(true);
    setSlow(false);
    setError(null);
    setAdded(false);
    try {
      const cart = await apiFetch<Cart>("/api/v1/cart/items", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, size, quantity }),
      });
      if (!cart) throw new ApiError(0, "Cart unavailable", crypto.randomUUID());
      setAdded(true);
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
                  setAdded(false);
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="reference-note" aria-live="polite">
            Size {size} selected. Stock is checked when your cart is reserved.
          </p>
          <div className="purchase-row">
            <label className="form-field" htmlFor="product-quantity">
              Quantity
              <span className="quantity-stepper">
                <button
                  className="step-button"
                  type="button"
                  disabled={quantity <= 1 || busy}
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((value) => value - 1)}
                >
                  −
                </button>
                <output id="product-quantity" aria-live="polite">
                  {quantity}
                </output>
                <button
                  className="step-button"
                  type="button"
                  disabled={quantity >= 10 || busy}
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((value) => value + 1)}
                >
                  +
                </button>
              </span>
            </label>
            <button type="button" disabled={busy} onClick={add}>
              {busy ? "Adding to cart…" : "Add to cart"}
            </button>
          </div>
          <p className="reference-note">Maximum 10 of one size per cart.</p>
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
      {added && (
        <div className="notice success-notice" role="status">
          <p>
            Added to your cart. <Link href="/cart">Review cart</Link>
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
