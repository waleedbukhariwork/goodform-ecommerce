const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(cents: number): string {
  if (!Number.isSafeInteger(cents)) return "Price unavailable";
  return usd.format(cents / 100);
}
