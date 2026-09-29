import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { apiConfig } from "./config.js";
import { safeLog } from "./logging.js";

@Catch()
export class ProblemFilter implements ExceptionFilter {
  constructor(private readonly config: ReturnType<typeof apiConfig>) {}
  catch(error: unknown, host: ArgumentsHost) {
    const request = host
      .switchToHttp()
      .getRequest<Request & { requestId?: string }>();
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const title =
      (
        {
          400: "Bad Request",
          404: "Not Found",
          503: "Service Unavailable",
        } as Record<number, string>
      )[status] ?? "Internal Server Error";
    const code =
      (
        {
          400: "INVALID_INPUT",
          404: "NOT_FOUND",
          503: "UNAVAILABLE",
        } as Record<number, string>
      )[status] ?? "INTERNAL_ERROR";
    if (status >= 500) {
      safeLog(this.config, "error", "http_error", {
        requestId: request.requestId,
        status,
        code,
      });
    }
    response.status(status).type("application/problem+json").json({
      type: "about:blank",
      title,
      status,
      detail: title,
      instance: request.path,
      code,
      requestId: request.requestId,
    });
  }
}
