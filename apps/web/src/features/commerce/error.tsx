import { ApiError } from "../../lib/transport";

export function Failure({
  error,
  context = "request",
}: {
  error: unknown;
  context?: "request" | "auth" | "signup" | "checkout";
}) {
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  const duplicate =
    context === "signup" &&
    error instanceof ApiError &&
    (error.status === 422 || error.status === 409);
  const message = duplicate
    ? // Deliberately does not confirm whether the address is registered.
      // Offers both real next steps instead of leaking account existence.
      "An account may already exist for that email. Try signing in, or reset your password if you have forgotten it."
    : context === "auth"
      ? "We could not sign you in with those details. Check them and try again."
      : context === "checkout"
        ? "Checkout could not be prepared. Your cart is still here; please review it before trying again."
        : error instanceof ApiError && error.status === 401
          ? "Please sign in to continue."
          : error instanceof ApiError && error.status === 409
            ? "That choice is no longer available. Review your cart and try again."
            : error instanceof ApiError && error.status === 0
              ? "We could not reach the store. Check your connection and try again."
              : "We could not complete that request. Please try again.";
  return (
    <div role="alert" className="notice error-notice">
      <p>{message}</p>
      <p className="reference-note">
        Support request ID: {requestId ?? "unavailable"}
      </p>
    </div>
  );
}
