import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { AppError } from "../src/common/errors/app-error.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { notFound } from "../src/middleware/not-found.js";
import { validate } from "../src/middleware/validate.js";

function responseRecorder(requestId = "test-request-id") {
  const recorded: { statusCode?: number; body?: unknown } = {};
  const response = {
    locals: { requestId },
    status(statusCode: number) {
      recorded.statusCode = statusCode;
      return this;
    },
    json(body: unknown) {
      recorded.body = body;
      return this;
    },
  } as unknown as Response;
  return { response, recorded };
}

function handleError(error: unknown, response: Response) {
  errorHandler(
    error,
    { method: "GET", path: "/test" } as Request,
    response,
    (() => {}) as NextFunction,
  );
}

test("missing routes return the shared 404 error format", () => {
  const { response, recorded } = responseRecorder();
  notFound({ method: "GET", path: "/missing" } as Request, response, (error) =>
    handleError(error, response),
  );

  assert.equal(recorded.statusCode, 404);
  assert.deepEqual(recorded.body, {
    error: {
      code: "NOT_FOUND",
      message: "So‘ralgan manzil topilmadi.",
      requestId: "test-request-id",
    },
  });
});

test("invalid request input becomes a shared 400 error", () => {
  const { response, recorded } = responseRecorder();
  const middleware = validate(
    z.object({ body: z.object({ name: z.string().min(1) }) }),
  );
  middleware(
    { params: {}, query: {}, body: { name: "" } } as Request,
    response,
    (error) => handleError(error, response),
  );

  assert.equal(recorded.statusCode, 400);
  assert.deepEqual(recorded.body, {
    error: {
      code: "VALIDATION_ERROR",
      message: "So‘rov ma’lumotlari noto‘g‘ri.",
      requestId: "test-request-id",
      details: [{ field: "body.name", message: "Kamida 1 ta belgi kiriting." }],
    },
  });
});

test("validation details use Uzbek messages and keep field paths", () => {
  const { response, recorded } = responseRecorder();
  const middleware = validate(
    z.object({
      body: z
        .object({
          name: z.string().min(1),
          count: z.number().max(3),
          mode: z.enum(["public", "private"]),
        })
        .strict(),
    }),
  );
  middleware(
    {
      params: {},
      query: {},
      body: { name: "", count: 4, mode: "unknown", extra: true },
    } as Request,
    response,
    (error) => handleError(error, response),
  );

  assert.equal(recorded.statusCode, 400);
  const body = recorded.body as {
    error: { code: string; details: Array<{ field: string; message: string }> };
  };
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.ok(
    body.error.details.some(
      (detail) =>
        detail.field === "body.name" &&
        detail.message === "Kamida 1 ta belgi kiriting.",
    ),
  );
  assert.ok(
    body.error.details.some(
      (detail) =>
        detail.field === "body.count" &&
        detail.message === "Qiymat 3 dan katta bo‘lmasligi kerak.",
    ),
  );
  assert.ok(
    body.error.details.some(
      (detail) =>
        detail.field === "body.mode" &&
        detail.message.includes("Ruxsat etilgan qiymatlardan"),
    ),
  );
  assert.ok(
    body.error.details.some(
      (detail) =>
        detail.field === "body" && detail.message === "Noma’lum maydon: extra.",
    ),
  );
});

test("internal errors return a safe shared 500 response", () => {
  const { response, recorded } = responseRecorder();
  handleError(
    new AppError(500, "DATABASE_FAILURE", "private token value"),
    response,
  );

  assert.equal(recorded.statusCode, 500);
  assert.deepEqual(recorded.body, {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Kutilmagan xatolik yuz berdi.",
      requestId: "test-request-id",
    },
  });
  assert.equal(
    JSON.stringify(recorded.body).includes("private token value"),
    false,
  );
});
