import type { RequestHandler } from "express";
import { AppError } from "../../common/errors/app-error.js";
import { env } from "../../config/env.js";
import { verifyAccessToken } from "./jwt.service.js";
import type { AuthenticatedUser } from "./auth.types.js";

export function createAuthenticate(
  secret = env.jwtAccessSecret,
): RequestHandler {
  return async (request, _response, next) => {
    const authorization = request.get("authorization");
    const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) {
      next(
        new AppError(401, "UNAUTHENTICATED", "Tizimga kirish talab qilinadi."),
      );
      return;
    }
    if (!secret) {
      next(
        new AppError(
          503,
          "AUTH_NOT_CONFIGURED",
          "Kirish tokenini tekshirish sozlanmagan.",
        ),
      );
      return;
    }

    try {
      request.auth = await verifyAccessToken(match[1], secret);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const authenticate = createAuthenticate();

export const optionalAuthenticate: RequestHandler = (
  request,
  response,
  next,
) => {
  if (!request.get("authorization")) {
    next();
    return;
  }
  authenticate(request, response, next);
};

export function requireRoles(
  ...roles: AuthenticatedUser["role"][]
): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(
        new AppError(401, "UNAUTHENTICATED", "Tizimga kirish talab qilinadi."),
      );
      return;
    }
    if (!roles.includes(request.auth.role)) {
      next(
        new AppError(
          403,
          "FORBIDDEN",
          "Bu amalni bajarishga ruxsatingiz yo‘q.",
        ),
      );
      return;
    }
    next();
  };
}
