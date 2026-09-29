export const dynamic = "force-dynamic";
import Link from "next/link";
import { getCart } from "../../features/commerce/api";
import { CartActions } from "../../features/commerce/cart-actions";
import { Failure } from "../../features/commerce/error";
import { ApiError } from "../../lib/transport";

export default async function CartPage() {
  let cart;
  try {
    cart = await getCart();
  } catch (error) {
    return (
      <main className="shell page-shell">
        <h1>Your cart</h1>
        <Failure error={error} />
        {error instanceof ApiError && error.status === 401 && (
          <Link href="/account">Sign in or create an account</Link>
        )}
      </main>
    );
  }
  return (
    <main className="shell page-shell">
      <Link href="/" className="back">
        ← Continue shopping
      </Link>
      <h1>Your cart</h1>
      {cart.items.length ? (
        <CartActions cart={cart} />
      ) : (
        <div className="empty">
          <p>Your cart is empty.</p>
          <Link href="/">Explore the collection</Link>
        </div>
      )}
    </main>
  );
}
