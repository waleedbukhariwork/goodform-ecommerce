export function webConfig(environment?: {
  APP_ENV?: string;
  NODE_ENV?: string;
  INTERNAL_API_ORIGIN?: string;
}) {
  const config = environment ?? process.env;
  const appEnv = config.APP_ENV ?? "dev";
  const nodeEnv =
    config.NODE_ENV ?? (appEnv === "dev" ? "development" : undefined);
  const raw = config.INTERNAL_API_ORIGIN;
  if (
    !["dev", "staging", "production"].includes(appEnv) ||
    !["development", "production"].includes(nodeEnv ?? "") ||
    (appEnv !== "dev" && nodeEnv !== "production") ||
    !raw
  ) {
    throw new Error("Invalid web runtime configuration");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid INTERNAL_API_ORIGIN");
  }
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
  return { appEnv, nodeEnv, internalApiOrigin: url.origin };
}
export function internalApiOrigin(environment?: {
  APP_ENV?: string;
  NODE_ENV?: string;
  INTERNAL_API_ORIGIN?: string;
}) {
  return webConfig(environment).internalApiOrigin;
}
