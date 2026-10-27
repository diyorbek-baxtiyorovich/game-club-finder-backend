import type { RequestHandler } from "express";
import { z } from "zod";

import { AppError } from "../common/errors/app-error.js";
import { validationMessageUz } from "../common/errors/validation-message.js";

export function validate(schema: z.ZodType): RequestHandler {
  return (request, response, next) => {
    const result = schema.safeParse({
      params: request.params,
      query: request.query,
      body: request.body,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: validationMessageUz(issue),
      }));
      next(
        new AppError(
          400,
          "VALIDATION_ERROR",
          "So‘rov ma’lumotlari noto‘g‘ri.",
          details,
        ),
      );
      return;
    }

    response.locals.validatedRequest = result.data;
    next();
  };
}
