import test from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "../src/lib/transport";
import { shopperMessage } from "../src/features/commerce/error";

test("shopper copy names safe reasons and hides provider text", () => {
  assert.equal(
    shopperMessage(
      new ApiError(409, "Conflict", "r1", "INSUFFICIENT_STOCK"),
      "checkout",
    ),
    "There is not enough of a size left for the quantity in your cart. Lower the quantity and try again.",
  );
  assert.equal(
    shopperMessage(
      new ApiError(503, "Stripe test checkout is not configured", "r2"),
      "checkout",
    ),
    "Checkout could not be prepared. Your cart is still here; please review it before trying again.",
  );
  assert.equal(
    shopperMessage(new ApiError(429, "Too Many Requests", "r3"), "checkout"),
    "Please wait a minute before trying checkout again. Your cart is still here.",
  );
  assert.equal(
    shopperMessage(new ApiError(401, "Unauthorized", "r4"), "checkout"),
    "Please sign in to continue.",
  );
  assert.match(
    shopperMessage(
      new ApiError(422, "User already exists.", "r5", "USER_ALREADY_EXISTS"),
      "signup",
    ),
    /already exists/,
  );
});
