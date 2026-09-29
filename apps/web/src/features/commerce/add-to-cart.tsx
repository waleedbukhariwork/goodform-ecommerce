"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "../../lib/transport";
import { Failure } from "./error";
import type { Cart } from "./api";

export function AddToCart({ slug, sizes }: { slug: string; sizes: string[] }) {
  const router = useRouter();
  const [size, setSize] = useState(sizes[0] ?? "M");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [added, setAdded] = useState(false);
  async function add() {
    setBusy(true);
    setError(null);
    setAdded(false);
    try {
      await apiFetch<Cart>("/api/v1/cart/items", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, size, quantity }),
      });
      setAdded(true);
      router.refresh();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="purchase-panel" aria-label="Add to cart">
      <div className="form-row">
        <label>
          Size
          <select
            value={size}
            onChange={(event) => setSize(event.target.value)}
          >
            {sizes.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity
          <input
            type="number"
            min={1}
            max={10}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={
          busy || quantity < 1 || quantity > 10 || !Number.isInteger(quantity)
        }
        onClick={add}
      >
        {busy ? "Adding…" : "Add to cart"}
      </button>
      {added && (
        <p role="status">
          Added to cart. <Link href="/cart">View cart</Link>
        </p>
      )}
      {error !== null && (
        <>
          <Failure error={error} />
          {error instanceof ApiError && error.status === 401 && (
            <Link href="/account">Sign in</Link>
          )}
        </>
      )}
    </section>
  );
}
