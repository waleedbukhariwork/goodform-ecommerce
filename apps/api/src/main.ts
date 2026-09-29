import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  BadRequestException,
  HttpException,
  ValidationPipe,
  type ValidationError,
} from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { json, raw, type Express, type Request, type Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { PaymentsService } from "./modules/payments/index.js";
import { IdentityService } from "./modules/identity/index.js";
import {
  originCheck,
  sessionGuard,
} from "./modules/identity/presentation/access.middleware.js";
import {
  assignRequestId,
  SafeLogger,
  safeLog,
  withRequestContext,
} from "./logging.js";
import { ObserveInstrument } from "./observe.js";
import { apiConfig } from "./config.js";
import { ProblemFilter } from "./problem.filter.js";

export async function bootstrap() {
  const config = apiConfig();
  const app = await NestFactory.create(AppModule, {
    logger: new SafeLogger(config),
    bodyParser: false,
    ...(config.OBSERVE_ENABLED ? { instrument: ObserveInstrument } : {}),
  });
  app.use(
    (
      request: Request & { requestId?: string },
      response: Response,
      next: () => void,
    ) => {
      const requestId = assignRequestId(request);
      response.setHeader("X-Request-Id", requestId);
      withRequestContext(requestId, () => {
        response.once("finish", () =>
          safeLog(config, "info", "http_request", {
            requestId,
            status: response.statusCode,
          }),
        );
        next();
      });
    },
  );
  const expressApp = app.getHttpAdapter().getInstance() as Express;
  // Auth and mail-cooldown responses carry account state and must never be
  // stored. Scoped to those prefixes only: the catalog GET is a verified
  // public ETag cache and must keep its own headers.
  expressApp.use(
    /^\/api\/(auth|v1\/auth)/,
    (_request: Request, response: Response, next: () => void) => {
      response.setHeader("Cache-Control", "private, no-store");
      next();
    },
  );
  const identity = app.get(IdentityService);
  expressApp.use(
    "/api/auth",
    async (request: Request, response: Response, next: () => void) => {
      try {
        const current = await identity.sessionFromHeaders(request.headers);
        if (
          current &&
          request.method === "POST" &&
          ["/sign-in/email", "/sign-up/email"].includes(request.path)
        )
          await identity.revokeFromHeaders(request.headers);
        next();
      } catch {
        response
          .status(503)
          .type("application/problem+json")
          .json({
            type: "about:blank",
            title: "Service Unavailable",
            status: 503,
            detail: "Service Unavailable",
            instance: request.path,
            code: "UNAVAILABLE",
            requestId: (request as Request & { requestId?: string }).requestId,
          });
      }
    },
  );
  expressApp.all("/api/auth/*splat", toNodeHandler(identity.auth));
  const payments = app.get(PaymentsService);
  expressApp.post(
    "/api/stripe/webhook",
    raw({ type: "application/json", limit: "256kb" }),
    async (request: Request & { requestId?: string }, response: Response) => {
      response.setHeader("Cache-Control", "private, no-store");
      try {
        if (!Buffer.isBuffer(request.body))
          throw new BadRequestException("Invalid webhook body");
        const signature = request.headers["stripe-signature"];
        const event = payments.verifyWebhook(
          request.body,
          typeof signature === "string" ? signature : undefined,
        );
        const result = await payments.handleWebhook(event);
        response
          .status(200)
          .json({ received: true, duplicate: result.duplicate });
      } catch (error) {
        const status = error instanceof HttpException ? error.getStatus() : 500;
        response
          .status(status)
          .type("application/problem+json")
          .json({
            type: "about:blank",
            title:
              status === 400
                ? "Bad Request"
                : status === 503
                  ? "Service Unavailable"
                  : "Internal Server Error",
            status,
            detail:
              status === 400
                ? "Invalid webhook"
                : "Webhook processing unavailable",
            instance: request.path,
            code: status === 400 ? "INVALID_WEBHOOK" : "UNAVAILABLE",
            requestId: request.requestId,
          });
      }
    },
  );
  app.use(originCheck(config));
  app.use(sessionGuard(identity));
  app.use(json({ limit: "32kb" }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false, value: false },
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: (errors: ValidationError[]) => {
        const fieldErrors: Record<string, string[]> = {};
        for (const error of errors) {
          fieldErrors[error.property] = Object.keys(
            error.constraints ?? {},
          ).sort();
        }
        return new BadRequestException({ fieldErrors });
      },
    }),
  );
  app.useGlobalFilters(new ProblemFilter(config));
  app.enableShutdownHooks(["SIGTERM", "SIGINT"]);
  await app.listen(config.PORT, config.BIND_ADDRESS);
  safeLog(config, "info", "startup");
  return app;
}

if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  bootstrap().catch(() => {
    process.stderr.write(
      "API startup failed: check configuration and dependencies\n",
    );
    process.exitCode = 1;
  });
}
