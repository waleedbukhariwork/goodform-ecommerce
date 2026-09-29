export const dynamic = "force-dynamic";
import Link from "next/link";
import { getOrder } from "../../../features/commerce/api";
import { Failure } from "../../../features/commerce/error";
import { OrderStatus } from "../../../features/commerce/order-status";
import { Icon } from "../../../components/ui/icon";
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  try {
    const order = await getOrder(id);
    return (
      <main id="main" className="shell page-shell">
        <Link className="back" href="/">
          <Icon name="arrow-left" /> Collection
        </Link>
        <span className="eyebrow">Your purchase</span>
        <h1 className="page-heading">Order status</h1>
        <OrderStatus initial={order} />
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
