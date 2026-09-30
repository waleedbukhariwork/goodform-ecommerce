export const dynamic = "force-dynamic";
import Link from "next/link";
import { getOrder } from "../../../features/commerce/api";
import { Failure } from "../../../features/commerce/error";
import { OrderStatus } from "../../../features/commerce/order-status";
import { Icon } from "../../../components/ui/icon";
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { id } = await params;
  const checkout = (await searchParams).checkout;
  const returnState =
    checkout === "return" || checkout === "cancelled" ? checkout : null;
  try {
    const order = await getOrder(id);
    return (
      <main id="main" className="shell page-shell">
        <Link className="back" href="/orders">
          <Icon name="arrow-left" /> Your orders
        </Link>
        <span className="eyebrow">Your purchase</span>
        <h1 className="page-heading">Order status</h1>
        <OrderStatus initial={order} checkout={returnState} />
      </main>
    );
  } catch (error) {
    return (
      <main id="main" className="shell page-shell">
        <h1 className="page-heading">Order unavailable</h1>
        <Failure error={error} />
        <Link className="button secondary" href="/cart">
          Back to cart
        </Link>
      </main>
    );
  }
}
