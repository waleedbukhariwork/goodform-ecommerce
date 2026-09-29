import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { apiConfig } from "./config.js";
import { ProblemFilter } from "./problem.filter.js";

export async function bootstrap() {
  const config = apiConfig();
  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(
    (
      request: { requestId?: string },
      response: { setHeader: (name: string, value: string) => void },
      next: () => void,
    ) => {
      request.requestId = randomUUID();
      response.setHeader("X-Request-Id", request.requestId);
      next();
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
  app.useGlobalFilters(new ProblemFilter());
  await app.listen(config.PORT, "127.0.0.1");
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
