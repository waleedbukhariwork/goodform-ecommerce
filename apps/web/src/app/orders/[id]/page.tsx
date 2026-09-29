import Link from "next/link";
import { getOrder } from "../../../features/commerce/api";
import { Failure } from "../../../features/commerce/error";
import { OrderStatus } from "../../../features/commerce/order-status";
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const order = await getOrder(id);
    return (
      <main className="shell page-shell">
        <Link className="back" href="/">
          ← Collection
        </Link>
        <h1>Your order</h1>
        <OrderStatus initial={order} />
      </main>
    );
  } catch (error) {
    return (
      <main className="shell page-shell">
        <h1>Order unavailable</h1>
        <Failure error={error} />
        <Link href="/cart">Back to cart</Link>
      </main>
    );
  }
}
