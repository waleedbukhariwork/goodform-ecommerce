import "server-only";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import type { components } from "@goodform/api-contracts";
import { apiFetch } from "../../lib/transport";
import { internalApiOrigin } from "../../lib/config";

export type Product = components["schemas"]["ProductDto"];
export type ProductList = components["schemas"]["ProductListDto"];

async function correlationHeaders() {
  const incoming = (await headers()).get("x-request-id");
  const id =
    incoming &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      incoming,
    )
      ? incoming
      : randomUUID();
  return { "x-request-id": id };
}

export async function listProducts(q: string) {
  return (await apiFetch<ProductList>(
    "/api/v1/products?q=" + encodeURIComponent(q),
    { origin: internalApiOrigin(), headers: await correlationHeaders() },
  ))!;
}
export async function getProduct(slug: string) {
  return (await apiFetch<Product>(
    "/api/v1/products/" + encodeURIComponent(slug),
    { origin: internalApiOrigin(), headers: await correlationHeaders() },
  ))!;
}
