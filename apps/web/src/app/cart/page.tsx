export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Link from "next/link";
import { getCart } from "../../features/commerce/api";
import { CartActions } from "../../features/commerce/cart-actions";
import { Failure } from "../../features/commerce/error";
import { ApiError } from "../../lib/transport";
import { Icon } from "../../components/ui/icon";

export const metadata: Metadata = {
  title: "Your cart — Goodform",
  description:
    "Sign in to save each garment, size, and quantity in your Goodform cart, then review the selection before checkout.",
};

export default async function CartPage() {
  let cart;
  try {
    cart = await getCart();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return (
        <main id="main" className="shell page-shell">
          <span className="eyebrow">Your selection</span>
          <h1 className="page-heading">Your cart</h1>
          <section className="guest-cart" aria-labelledby="guest-cart-title">
            <div className="bag-stage">
              <div className="bag-object" aria-hidden="true">
                <span className="bag-handle" />
                <span className="bag-side" />
                <span className="bag-front">g</span>
              </div>
            </div>
            <div>
              <h2 id="guest-cart-title">Sign in to fill your cart</h2>
              <p>
                Save each garment with its size and quantity. Sign in, or create
                an account, and the cart stays with you until checkout.
              </p>
              <Link className="button" href="/account">
                Sign in or create an account
              </Link>
              <Link className="back" href="/">
                Browse the collection
              </Link>
            </div>
          </section>
        </main>
      );
    }
    return (
      <main id="main" className="shell page-shell">
        <span className="eyebrow">Your selection</span>
        <h1 className="page-heading">Your cart</h1>
        <Failure error={error} />
      </main>
    );
  }
  return (
    <main id="main" className="shell page-shell">
      <Link href="/" className="back">
        <Icon name="arrow-left" /> Continue shopping
      </Link>
      <span className="eyebrow">Your selection</span>
      <h1 className="page-heading">Your cart</h1>
      {cart.items.length ? (
        <CartActions cart={cart} />
      ) : (
        <div className="empty-panel">
          <h2>Start with a garment you can live in.</h2>
          <p>
            Your cart is empty. Browse the collection, then compare the
            measurements before you choose.
          </p>
          <Link className="button" href="/">
            Explore the collection
          </Link>
        </div>
      )}
    </main>
  );
}
