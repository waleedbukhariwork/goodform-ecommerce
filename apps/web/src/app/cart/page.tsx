export const dynamic = "force-dynamic";
import Link from "next/link";
import { getCart } from "../../features/commerce/api";
import { CartActions } from "../../features/commerce/cart-actions";
import { Failure } from "../../features/commerce/error";
import { ApiError } from "../../lib/transport";
import { Icon } from "../../components/ui/icon";

export default async function CartPage() {
  let cart;
  try {
    cart = await getCart();
  } catch (error) {
    return (
      <main id="main" className="shell page-shell">
        <span className="eyebrow">Your selection</span>
        <h1 className="page-heading">Your cart</h1>
        <Failure error={error} />
        {error instanceof ApiError && error.status === 401 && (
          <Link className="button" href="/account">
            Sign in or create an account
          </Link>
        )}
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
