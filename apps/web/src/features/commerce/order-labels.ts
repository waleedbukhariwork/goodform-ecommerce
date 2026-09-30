export function orderStatusLabel(status: string) {
  switch (status) {
    case "paid":
      return "Payment confirmed";
    case "payment_pending":
      return "Waiting for payment";
    case "failed":
      return "Payment failed";
    case "cancelled":
      return "Checkout cancelled";
    default:
      return "Order update";
  }
}
