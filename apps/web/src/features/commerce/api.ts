import "server-only";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import type { components } from "@goodform/api-contracts";
import { internalApiOrigin } from "../../lib/config";
import { apiFetch } from "../../lib/transport";

export type Cart = components["schemas"]["CartDto"];
export type Order = components["schemas"]["OrderDto"];

async function privateHeaders() {
  const incoming = await headers();
  const requestId = incoming.get("x-request-id");
  return {
    cookie: incoming.get("cookie") ?? "",
    "x-request-id":
      requestId && /^[0-9a-f-]{36}$/i.test(requestId)
        ? requestId
        : randomUUID(),
  };
}

export async function getCart() {
  return (await apiFetch<Cart>("/api/v1/cart", {
    origin: internalApiOrigin(),
    headers: await privateHeaders(),
  }))!;
}

export async function getOrder(id: string) {
  return (await apiFetch<Order>("/api/v1/orders/" + encodeURIComponent(id), {
    origin: internalApiOrigin(),
    headers: await privateHeaders(),
  }))!;
}
