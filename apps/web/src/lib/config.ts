export function internalApiOrigin(environment?: {
  INTERNAL_API_ORIGIN?: string;
}) {
  const raw = environment
    ? environment.INTERNAL_API_ORIGIN
    : process.env.INTERNAL_API_ORIGIN;
  if (!raw) throw new Error("INTERNAL_API_ORIGIN is required");
  const url = new URL(raw);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid INTERNAL_API_ORIGIN");
  }
  return url.origin;
}
