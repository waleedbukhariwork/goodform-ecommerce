import { ApiError } from "../../lib/transport";

const CODE_MESSAGE: Record<string, string> = {
  USER_ALREADY_EXISTS:
    "An account already exists for that email. Sign in, or reset your password if you have forgotten it.",
  INSUFFICIENT_STOCK:
    "There is not enough of a size left for the quantity in your cart. Lower the quantity and try again.",
  CART_EMPTY: "Your cart is empty.",
  UNKNOWN_SIZE: "That size is not offered for this garment.",
  VARIANT_UNAVAILABLE:
    "A size in your cart is no longer available. Remove it and try again.",
  CART_ITEM_LIMIT:
    "Your cart already has the maximum number of sizes. Remove one before adding another.",
  CART_ITEM_NOT_FOUND: "That item is no longer in your cart.",
  RESERVATION_NOT_FOUND:
    "The cart hold ended. Review your cart and try checkout again.",
  RESERVATION_UNAVAILABLE:
    "Those quantities could not be held. Review your cart and try again.",
  CHECKOUT_IN_PROGRESS:
    "A checkout is already in progress. Wait a moment, then try again. Your cart is still here.",
  CHECKOUT_NOT_STARTED:
    "Checkout did not start. Your cart is still here. Please try again.",
  PAYMENTS_UNAVAILABLE:
    "Payment cannot start right now. Your cart is still here. Please try again shortly.",
};

export function shopperMessage(
  error: unknown,
  context:
    | "request"
    | "auth"
    | "signup"
    | "checkout"
    | "verification"
    | "reset"
    | "password"
    | "profile" = "request",
) {
  const status = error instanceof ApiError ? error.status : undefined;
  const code = error instanceof ApiError ? error.code : undefined;
  if (code && CODE_MESSAGE[code]) return CODE_MESSAGE[code];
  const duplicate = context === "signup" && (status === 422 || status === 409);
  if (duplicate)
    return "An account already exists for that email. Sign in, or reset your password if you have forgotten it.";
  if (status === 429) {
    if (context === "checkout")
      return "Please wait a minute before trying checkout again. Your cart is still here.";
    if (
      context === "verification" ||
      context === "reset" ||
      context === "signup"
    )
      return "You can request one email per minute. Please wait, then try again.";
    return "Please wait a minute, then try again.";
  }
  if (status === 0)
    return "We could not reach the store. Check your connection and try again.";
  if (context === "verification")
    return "We could not send the verification link. Wait a minute, then try again.";
  if (context === "reset")
    return "We could not send a reset link just now. Wait a minute and try again.";
  if (context === "password")
    return "That reset link could not update your password. Request a new link and try again.";
  if (context === "profile")
    return status === 400
      ? "Those details were not accepted. Check them and try again."
      : "We could not update your account. Please try again.";
  if (context === "auth")
    return "We could not sign you in with those details. Check them and try again.";
  if (status === 401) return "Please sign in to continue.";
  if (context === "checkout")
    return "Checkout could not be prepared. Your cart is still here; please review it before trying again.";
  if (status === 409)
    return "That choice is no longer available. Review your cart and try again.";
  return "We could not complete that request. Please try again.";
}

export function Failure({
  error,
  context = "request",
}: {
  error: unknown;
  context?:
    | "request"
    | "auth"
    | "signup"
    | "checkout"
    | "verification"
    | "reset"
    | "password"
    | "profile";
}) {
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <div role="alert" className="notice error-notice">
      <p>{shopperMessage(error, context)}</p>
      <p className="reference-note">
        Support request ID: {requestId ?? "unavailable"}
      </p>
    </div>
  );
}
