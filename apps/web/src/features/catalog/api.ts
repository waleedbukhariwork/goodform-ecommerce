import "server-only";
import type { components } from "@goodform/api-contracts";
import { apiFetch } from "../../lib/transport";
import { internalApiOrigin } from "../../lib/config";

export type Product = components["schemas"]["ProductDto"];
export type ProductList = components["schemas"]["ProductListDto"];

export async function listProducts(q: string) {
  return (await apiFetch<ProductList>(
    "/api/v1/products?q=" + encodeURIComponent(q),
    { origin: internalApiOrigin() },
  ))!;
}
export async function getProduct(slug: string) {
  return (await apiFetch<Product>(
    "/api/v1/products/" + encodeURIComponent(slug),
    { origin: internalApiOrigin() },
  ))!;
}
