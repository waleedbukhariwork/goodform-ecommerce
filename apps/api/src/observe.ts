import { createObserveModule } from "@nestjs/observe";
import { apiConfig } from "./config.js";
import { Database } from "./db/database.js";
import { CatalogRepository } from "./modules/catalog/infrastructure/catalog.repository.js";
import { assignRequestId } from "./logging.js";

export const { ObserveModule, ObserveInstrument } = createObserveModule({
  sourceContext: false,
  attachTraceIdToLogs: false,
  traceIdGenerator: assignRequestId,
  skipInstrumentation: (instance) =>
    instance instanceof Database || instance instanceof CatalogRepository,
});

export function observeImports() {
  const config = apiConfig();
  if (!config.OBSERVE_ENABLED) return [];
  return [
    ObserveModule.forRoot({
      appKey: config.OBSERVE_APP_KEY!,
      appSecret: config.OBSERVE_APP_SECRET!,
      serviceId: config.OBSERVE_SERVICE_ID!,
      serviceVersion: config.RELEASE_SHA,
      ...(config.OBSERVE_ENDPOINT ? { endpoint: config.OBSERVE_ENDPOINT } : {}),
      http: {
        capture: false,
        queryParamsObfuscateRegex: /.*/,
        ignore: (request) =>
          request.path?.startsWith("/api/v1/health") ?? false,
        tags: {
          environment: config.APP_ENV,
          release: config.RELEASE_SHA ?? "local",
        },
      },
      outgoing: { database: true, http: false },
      redaction: {
        enabled: true,
        useDefaultPatterns: true,
        keys: [
          "q",
          "photo",
          "image",
          "signedUrl",
          "email",
          "password",
          "hash",
          "token",
          "cookie",
          "authorization",
          "set-cookie",
          "session",
          "accountId",
          "userId",
        ],
        patterns: [/postgres(?:ql)?:\/\/[^\s"'\\]+/gi],
      },
      forwardLogs: false,
      runtimeMetrics: false,
      debug: false,
      tracesSampleRate: config.OBSERVE_SAMPLE_RATE,
      maxTracesPerBatch: 25,
      flushInterval: 2000,
    }),
  ];
}
