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
          401: "Unauthorized",
          403: "Forbidden",
          409: "Conflict",
          429: "Too Many Requests",
          404: "Not Found",
          503: "Service Unavailable",
        } as Record<number, string>
      )[status] ?? "Internal Server Error";
    const code =
      (
        {
          400: "INVALID_INPUT",
          401: "UNAUTHORIZED",
          403: "FORBIDDEN",
          409: "CONFLICT",
          429: "RATE_LIMITED",
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
    const errorBody =
      error instanceof HttpException ? error.getResponse() : undefined;
    const fieldErrors =
      status === 400 &&
      typeof errorBody === "object" &&
      errorBody !== null &&
      "fieldErrors" in errorBody &&
      typeof errorBody.fieldErrors === "object"
        ? errorBody.fieldErrors
        : undefined;
    response
      .status(status)
      .type("application/problem+json")
      .json({
        type: "about:blank",
        title,
        status,
        detail: title,
        instance: request.path,
        code,
        requestId: request.requestId,
        ...(fieldErrors ? { fieldErrors } : {}),
      });
  }
}
