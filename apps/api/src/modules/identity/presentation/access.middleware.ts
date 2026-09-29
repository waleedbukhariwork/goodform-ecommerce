import type { NextFunction, Request, Response } from "express";
import type { apiConfig } from "../../../config.js";
import { IdentityService } from "../application/identity.service.js";

type RuntimeConfig = ReturnType<typeof apiConfig>;
export type OwnerRequest = Request & { ownerId?: string; requestId?: string };

const publicReads = [
  /^\/api\/v1\/health\/(live|ready)$/,
  /^\/api\/v1\/products$/,
  /^\/api\/v1\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/,
];

function deny(
  response: Response,
  request: OwnerRequest,
  status: 401 | 403 | 503,
) {
  response.setHeader("Cache-Control", "private, no-store");
  const title =
    status === 401
      ? "Unauthorized"
      : status === 403
        ? "Forbidden"
        : "Service Unavailable";
  response
    .status(status)
    .type("application/problem+json")
    .json({
      type: "about:blank",
      title,
      status,
      detail: title,
      instance: request.path,
      code:
        status === 401
          ? "UNAUTHORIZED"
          : status === 403
            ? "FORBIDDEN"
            : "UNAVAILABLE",
      requestId: request.requestId,
    });
}

export function originCheck(config: RuntimeConfig) {
  return (request: OwnerRequest, response: Response, next: NextFunction) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
    if (request.headers.origin !== config.PUBLIC_ORIGIN)
      return deny(response, request, 403);
    next();
  };
}

export function sessionGuard(identity: IdentityService) {
  return async (
    request: OwnerRequest,
    response: Response,
    next: NextFunction,
  ) => {
    if (
      ["GET", "HEAD"].includes(request.method) &&
      publicReads.some((route) => route.test(request.path))
    )
      return next();
    response.setHeader("Cache-Control", "private, no-store");
    try {
      const current = await identity.sessionFromHeaders(request.headers);
      if (!current) return deny(response, request, 401);
      request.ownerId = current.user.id;
      next();
    } catch {
      deny(response, request, 503);
    }
  };
}
