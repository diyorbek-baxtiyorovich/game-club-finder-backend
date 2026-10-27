import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

import { logger } from "../common/logger.js";

export const requestContext: RequestHandler = (request, response, next) => {
  const requestId = randomUUID();
  const startedAt = process.hrtime.bigint();

  response.locals.requestId = requestId;
  response.setHeader("X-Request-Id", requestId);
  response.on("finish", () => {
    const responseTimeMs =
      Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info(
      {
        requestId,
        method: request.method,
        ...(typeof request.route?.path === "string"
          ? { route: `${request.baseUrl}${request.route.path}` }
          : {}),
        statusCode: response.statusCode,
        responseTimeMs: Number(responseTimeMs.toFixed(2)),
      },
      "So‘rov yakunlandi",
    );
  });

  next();
};
