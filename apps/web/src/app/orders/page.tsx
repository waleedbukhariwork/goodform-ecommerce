export const dynamic = "force-dynamic";
import Link from "next/link";
import { listOrders } from "../../features/commerce/api";
import { Failure } from "../../features/commerce/error";
import { orderStatusLabel } from "../../features/commerce/order-labels";
import { ApiError } from "../../lib/transport";
import { formatMoney } from "../../lib/money";

export default async function OrdersPage() {
  let orders;
  try {
    orders = await listOrders();
  } catch (error) {
    return (
      <main id="main" className="shell page-shell">
        <span className="eyebrow">Your purchases</span>
        <h1 className="page-heading">Your orders</h1>
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
      <span className="eyebrow">Your purchases</span>
      <h1 className="page-heading">Your orders</h1>
      {orders.items.length ? (
        <section aria-label="Orders" className="order-list">
          {orders.items.map((order) => (
            <article className="order-row" key={order.id}>
              <div>
                <h2>
                  <Link href={`/orders/${order.id}`}>
                    {orderStatusLabel(order.status)}
                  </Link>
                </h2>
                <p>
                  {new Intl.DateTimeFormat("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(order.createdAt))}
                  {" · "}
                  {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                </p>
                {order.lines.length > 0 && (
                  <ul className="order-lines">
                    {order.lines.map((line, index) => (
                      <li key={`${line.name}-${line.size}-${index}`}>
                        {line.name}, size {line.size} × {line.quantity}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <strong>{formatMoney(order.totalCents)}</strong>
            </article>
          ))}
          {orders.items.length === 50 && (
            <p className="muted">Showing your 50 most recent orders.</p>
          )}
        </section>
      ) : (
        <div className="empty-panel">
          <h2>No orders yet.</h2>
          <p>
            When a checkout is confirmed, it will be listed here. Your cart
            stays unchanged until payment is confirmed.
          </p>
          <Link className="button" href="/">
            Explore the collection
          </Link>
        </div>
      )}
    </main>
  );
}
