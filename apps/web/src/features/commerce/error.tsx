import { ApiError } from "../../lib/transport";

export function Failure({ error }: { error: unknown }) {
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <div role="alert" className="notice error-notice">
      <p>
        {error instanceof ApiError && error.status === 401
          ? "Please sign in to continue."
          : "We could not complete that request. Please try again."}
      </p>
      <p>Support request ID: {requestId ?? "unavailable"}</p>
    </div>
  );
}
