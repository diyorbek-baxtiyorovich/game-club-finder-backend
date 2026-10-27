import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import { z } from "zod";

import { createApp } from "../src/app.js";
import { AppError } from "../src/common/errors/app-error.js";
import { validate } from "../src/middleware/validate.js";

let databaseAvailable = true;
const app = createApp(
  (router) => {
    router.post(
      "/input",
      validate(z.object({ body: z.object({ name: z.string().min(1) }) })),
      (_request, response) => response.json({ status: "accepted" }),
    );
    router.get("/failure", () => {
      throw new Error("private token value");
    });
  },
  async () => {
    if (!databaseAvailable) {
      throw new AppError(
        503,
        "DATABASE_UNAVAILABLE",
        "Database is unavailable",
      );
    }
  },
);

let server: Server;
let baseUrl: string;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("health responds with JSON and a generated request ID", async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  assert.match(response.headers.get("x-request-id") ?? "", /^[0-9a-f-]{36}$/);
});

test("health returns a safe 503 while the database is unavailable", async () => {
  databaseAvailable = false;
  const response = await fetch(`${baseUrl}/api/health`);
  databaseAvailable = true;
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error.code, "DATABASE_UNAVAILABLE");
  assert.equal(body.error.message, "Ma’lumotlar bazasi hozir ishlamayapti.");
  assert.ok(body.error.requestId);
});

test("unknown routes return a 404 error response", async () => {
  const response = await fetch(`${baseUrl}/api/missing`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.deepEqual(Object.keys(body), ["error"]);
  assert.equal(body.error.code, "NOT_FOUND");
  assert.equal(body.error.message, "So‘ralgan manzil topilmadi.");
  assert.ok(body.error.requestId);
});

test("invalid input returns a 400 error response", async () => {
  const response = await fetch(`${baseUrl}/api/input`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "" }),
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "VALIDATION_ERROR");
  assert.equal(body.error.message, "So‘rov ma’lumotlari noto‘g‘ri.");
  assert.equal(body.error.details[0].field, "body.name");
  assert.ok(body.error.requestId);
});

test("malformed JSON returns the same safe 400 response shape", async () => {
  const response = await fetch(`${baseUrl}/api/input`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_JSON");
  assert.equal(body.error.message, "So‘rov tanasidagi JSON noto‘g‘ri.");
  assert.ok(body.error.requestId);
});

test("internal errors return a 500 response without exposing error details", async () => {
  const response = await fetch(`${baseUrl}/api/failure`);
  const text = await response.text();

  assert.equal(response.status, 500);
  assert.match(text, /INTERNAL_SERVER_ERROR/);
  assert.match(text, /Kutilmagan xatolik yuz berdi/);
  assert.doesNotMatch(text, /private token value/);
  assert.doesNotMatch(text, /stack/i);
});
