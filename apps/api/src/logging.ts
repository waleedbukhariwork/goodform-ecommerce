import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { LoggerService } from "@nestjs/common";
import type { Request } from "express";
import type { apiConfig } from "./config.js";

type RuntimeConfig = ReturnType<typeof apiConfig>;
type RequestContext = { requestId: string };
const context = new AsyncLocalStorage<RequestContext>();
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assignRequestId(request: unknown): string {
  const candidate = request as (Request & { requestId?: string }) | null;
  if (!candidate || typeof candidate !== "object") return randomUUID();
  if (candidate.requestId && uuid.test(candidate.requestId))
    return candidate.requestId;
  const header = candidate.headers?.["x-request-id"];
  const id =
    typeof header === "string" && uuid.test(header) ? header : randomUUID();
  candidate.requestId = id;
  return id;
}

export function withRequestContext<T>(requestId: string, callback: () => T): T {
  return context.run({ requestId }, callback);
}

export function safeLog(
  config: RuntimeConfig,
  level: "info" | "warn" | "error",
  event:
    | "http_request"
    | "http_error"
    | "framework_event"
    | "startup"
    | "shutdown"
    | "database_connection_error",
  fields: { requestId?: string; status?: number; code?: string } = {},
) {
  const requestId = fields.requestId ?? context.getStore()?.requestId;
  const record = {
    timestamp: new Date().toISOString(),
    level,
    service: "api",
    environment: config.APP_ENV,
    release: config.RELEASE_SHA ?? "local",
    event,
    ...(requestId ? { requestId } : {}),
    ...(config.OBSERVE_ENABLED && requestId ? { traceId: requestId } : {}),
    ...(fields.status !== undefined ? { status: fields.status } : {}),
    ...(fields.code ? { code: fields.code } : {}),
  };
  process.stdout.write(JSON.stringify(record) + "\n");
}

export class SafeLogger implements LoggerService {
  constructor(private readonly config: RuntimeConfig) {}
  log() {
    safeLog(this.config, "info", "framework_event");
  }
  warn() {
    safeLog(this.config, "warn", "framework_event");
  }
  error() {
    safeLog(this.config, "error", "framework_event");
  }
  debug() {}
  verbose() {}
}
