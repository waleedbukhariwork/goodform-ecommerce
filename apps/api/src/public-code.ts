import { HttpException, HttpStatus } from "@nestjs/common";

/** Stable reasons the shopper may see. Never put secrets, provider names, or raw errors here. */
export const PUBLIC_CODES = [
  "UNKNOWN_SIZE",
  "CART_EMPTY",
  "CART_ITEM_LIMIT",
  "CART_ITEM_NOT_FOUND",
  "VARIANT_UNAVAILABLE",
  "INSUFFICIENT_STOCK",
  "RESERVATION_NOT_FOUND",
  "RESERVATION_UNAVAILABLE",
  "CHECKOUT_IN_PROGRESS",
  "CHECKOUT_NOT_STARTED",
  "PAYMENTS_UNAVAILABLE",
] as const;

export type PublicCode = (typeof PUBLIC_CODES)[number];

const PUBLIC_CODE_SET = new Set<string>(PUBLIC_CODES);

export function isPublicCode(value: unknown): value is PublicCode {
  return typeof value === "string" && PUBLIC_CODE_SET.has(value);
}

export function publicException(status: HttpStatus, code: PublicCode) {
  return new HttpException({ code }, status);
}

const STATUS_CODES: Record<number, string> = {
  400: "INVALID_INPUT",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  429: "RATE_LIMITED",
  503: "UNAVAILABLE",
};

/** Prefer a whitelisted code. Ignore any other exception text. */
export function codeForException(error: unknown, status: number) {
  if (error instanceof HttpException) {
    const body = error.getResponse();
    if (
      body &&
      typeof body === "object" &&
      "code" in body &&
      isPublicCode(body.code)
    )
      return body.code;
  }
  return STATUS_CODES[status] ?? "INTERNAL_ERROR";
}
