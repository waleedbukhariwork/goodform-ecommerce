export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}
export async function apiFetch<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number; origin?: string } = {},
): Promise<T | undefined> {
  if (!path.startsWith("/api/") || path.startsWith("//"))
    throw new Error("Invalid API path");
  const { timeoutMs = 5000, origin, signal, ...rest } = options;
  const requestHeaders = new Headers(rest.headers);
  const requestId = requestHeaders.get("x-request-id") ?? crypto.randomUUID();
  requestHeaders.set("x-request-id", requestId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch((origin ?? "") + path, {
      ...rest,
      headers: requestHeaders,
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 204) return undefined;
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("json")
      ? await response.json().catch(() => null)
      : null;
    if (!response.ok) {
      const message = body?.title ?? body?.message ?? "Service unavailable";
      throw new ApiError(
        response.status,
        message,
        body?.requestId ?? response.headers.get("x-request-id") ?? requestId,
      );
    }
    if (!contentType.includes("json") || body === null)
      throw new ApiError(
        response.status,
        "Invalid service response",
        requestId,
      );
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted)
      throw new ApiError(0, "Request cancelled or timed out", requestId);
    throw new ApiError(0, "Service unavailable", requestId);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
