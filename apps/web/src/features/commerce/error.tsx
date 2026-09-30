import { ApiError } from "../../lib/transport";

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
    | "password";
}) {
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  const status = error instanceof ApiError ? error.status : undefined;
  const duplicate = context === "signup" && (status === 422 || status === 409);
  const waiting = status === 429;
  const offline = status === 0;
  const message = duplicate
    ? // Deliberately does not confirm whether the address is registered.
      // Offers both real next steps instead of leaking account existence.
      "An account may already exist for that email. Try signing in, or reset your password if you have forgotten it."
    : waiting
      ? "You can request one email per minute. Please wait, then try again."
      : offline
        ? "We could not reach the store. Check your connection and try again."
        : context === "verification"
          ? "We could not send another verification link. Wait a minute, then use Resend link again."
          : context === "reset"
            ? "We could not send a reset link just now. Wait a minute and try again."
            : context === "password"
              ? "That reset link could not update your password. Request a new link and try again."
              : context === "auth"
                ? "We could not sign you in with those details. Check them and try again."
                : context === "checkout"
                  ? "Checkout could not be prepared. Your cart is still here; please review it before trying again."
                  : status === 401
                    ? "Please sign in to continue."
                    : status === 409
                      ? "That choice is no longer available. Review your cart and try again."
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
