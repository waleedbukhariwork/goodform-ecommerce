import { internalApiOrigin } from "./lib/config";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") internalApiOrigin();
}
