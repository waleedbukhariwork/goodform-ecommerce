export const MAX_CART_LINES = 20;
export const MAX_ITEM_QUANTITY = 10;

export function calculateLine(priceCents: number, quantity: number) {
  if (
    !Number.isSafeInteger(priceCents) ||
    priceCents < 0 ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_ITEM_QUANTITY
  )
    throw new Error("Invalid cart amount");
  const total = priceCents * quantity;
  if (!Number.isSafeInteger(total)) throw new Error("Cart amount overflow");
  return total;
}

export function calculateTotal(lines: { lineTotalCents: number }[]) {
  const total = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  if (!Number.isSafeInteger(total)) throw new Error("Cart amount overflow");
  return total;
}
