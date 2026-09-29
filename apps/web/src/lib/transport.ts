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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const response = await fetch((origin ?? "") + path, {
      ...rest,
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 204) return undefined;
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("json")
      ? await response.json().catch(() => null)
      : null;
    if (!response.ok) {
      const message = body?.title ?? "Service unavailable";
      throw new ApiError(
        response.status,
        message,
        body?.requestId ?? response.headers.get("x-request-id") ?? undefined,
      );
    }
    if (!contentType.includes("json") || body === null)
      throw new ApiError(response.status, "Invalid service response");
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted)
      throw new ApiError(0, "Request cancelled or timed out");
    throw new ApiError(0, "Service unavailable");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
