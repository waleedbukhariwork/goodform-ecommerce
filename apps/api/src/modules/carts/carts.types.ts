export type CheckoutLine = {
  productId: string;
  slug: string;
  name: string;
  imagePath: string;
  size: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};
export type CheckoutCart = { lines: CheckoutLine[]; totalCents: number };
