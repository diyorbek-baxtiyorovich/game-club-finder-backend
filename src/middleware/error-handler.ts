import type { ErrorRequestHandler } from "express";

import { AppError } from "../common/errors/app-error.js";
import { logger } from "../common/logger.js";

interface ParserError extends Error {
  type?: string;
}

function toSafeAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      if (error.statusCode === 503 && error.code === "DATABASE_UNAVAILABLE") {
        return new AppError(
          503,
          "DATABASE_UNAVAILABLE",
          "Ma’lumotlar bazasi hozir ishlamayapti.",
        );
      }
      if (error.statusCode === 503 && error.code === "AUTH_NOT_CONFIGURED") {
        return new AppError(
          503,
          "AUTH_NOT_CONFIGURED",
          "Autentifikatsiya sozlanmagan.",
        );
      }
      return new AppError(
        500,
        "INTERNAL_SERVER_ERROR",
        "Kutilmagan xatolik yuz berdi.",
      );
    }
    return error;
  }

  const parserError = error as ParserError | null;
  if (parserError?.type === "entity.parse.failed") {
    return new AppError(
      400,
      "INVALID_JSON",
      "So‘rov tanasidagi JSON noto‘g‘ri.",
    );
  }
  if (parserError?.type === "entity.too.large") {
    return new AppError(
      413,
      "PAYLOAD_TOO_LARGE",
      "So‘rov tanasi 1 MB chegaradan oshdi.",
    );
  }

  return new AppError(
    500,
    "INTERNAL_SERVER_ERROR",
    "Kutilmagan xatolik yuz berdi.",
  );
}

export const errorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next,
) => {
  const appError = toSafeAppError(error);
  const requestId = response.locals.requestId ?? "unknown";
  const logContext = {
    requestId,
    method: request.method,
    ...(typeof request.route?.path === "string"
      ? { route: `${request.baseUrl}${request.route.path}` }
      : {}),
    statusCode: appError.statusCode,
    errorCode: appError.code,
  };

  if (appError.statusCode >= 500) {
    logger.error(logContext, "So‘rovda xatolik yuz berdi");
  } else {
    logger.warn(logContext, "So‘rov rad etildi");
  }

  response.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      requestId,
      ...(appError.details ? { details: appError.details } : {}),
    },
  });
};
