export type OrderStatus = "payment_pending" | "paid" | "failed" | "cancelled";
export function transitionOrderStatus(
  current: OrderStatus,
  next: Exclude<OrderStatus, "payment_pending">,
): OrderStatus {
  if (current === next) return current;
  if (current !== "payment_pending")
    throw new Error("Order status is terminal");
  return next;
}
