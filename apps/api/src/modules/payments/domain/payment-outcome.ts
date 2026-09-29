export type ProviderFacts = {
  paymentStatus: string;
  sessionStatus: string | null;
  eventType?: string;
};
export type PaymentOutcome = "paid" | "failed" | "cancelled" | null;

export function paymentOutcome(facts: ProviderFacts): PaymentOutcome {
  if (facts.paymentStatus === "paid") return "paid";
  if (facts.sessionStatus === "expired") return "cancelled";
  if (facts.eventType === "checkout.session.async_payment_failed")
    return "failed";
  return null;
}
