import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import type { Request, Response } from "express";
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
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false, value: false },
      transformOptions: { enableImplicitConversion: false },
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
