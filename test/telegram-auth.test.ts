import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import express from "express";
import request from "supertest";
import { before, test } from "node:test";

import { createAuthRouter } from "../src/modules/auth/auth.routes.js";
import { createTelegramAuthService } from "../src/modules/auth/telegram-auth.service.js";
import type { User } from "../src/modules/users/user.schema.js";
import { errorHandler } from "../src/middleware/error-handler.js";

const botTokenForTest = "test-only-bot-token";
const now = Date.UTC(2026, 0, 1, 12, 0, 0);
const user: User = {
  id: "12",
  telegramId: "987654321",
  role: "user",
  createdAt: new Date(now).toISOString(),
  updatedAt: new Date(now).toISOString(),
};
let upsertedTelegramIds: string[] = [];
let app: express.Express;

function makeInitData(
  telegramId = 987654321,
  authDate = Math.floor(now / 1000),
): string {
  const data = new URLSearchParams({
    auth_date: String(authDate),
    query_id: "test-query",
    user: JSON.stringify({ id: telegramId, first_name: "Test" }),
  });
  const checkString = [...data.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botTokenForTest)
    .digest();
  const hash = createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");
  data.set("hash", hash);
  return data.toString();
}

const authenticate = createTelegramAuthService(
  botTokenForTest,
  async (telegramId) => {
    upsertedTelegramIds.push(telegramId);
    return { ...user, telegramId };
  },
  () => now,
);

before(() => {
  upsertedTelegramIds = [];
  app = express();
  app.use(express.json());
  app.use(
    "/api/v1/auth",
    createAuthRouter({
      async loginTelegram(initData) {
        const authenticatedUser = await authenticate(initData);
        return {
          user: authenticatedUser,
          accessToken: "test-only-access-token",
          refreshToken: "test-only-refresh-token-123456789012345678901234",
          tokenType: "Bearer",
          expiresIn: 900,
        };
      },
      async refresh() {
        throw new Error("Not used by this test");
      },
      async logout() {},
    }),
  );
  app.use(errorHandler);
});

test("valid Telegram initData authenticates and forces the database user role", async () => {
  const response = await request(app)
    .post("/api/v1/auth/telegram")
    .send({ initData: makeInitData(), role: "admin", owner_id: "1" });
  const body = response.body;

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.user.telegramId, "987654321");
  assert.equal(body.data.user.role, "user");
  assert.deepEqual(upsertedTelegramIds, ["987654321"]);
});

test("modified signature and expired initData are rejected before user upsert", async () => {
  const invalid = new URLSearchParams(makeInitData());
  invalid.set("user", JSON.stringify({ id: 42, first_name: "Changed" }));
  const invalidResponse = await request(app)
    .post("/api/v1/auth/telegram")
    .send({ initData: invalid.toString() });
  const expiredResponse = await request(app)
    .post("/api/v1/auth/telegram")
    .send({ initData: makeInitData(42, Math.floor(now / 1000) - 86401) });

  assert.equal(invalidResponse.status, 401);
  assert.equal(expiredResponse.status, 401);
  assert.deepEqual(upsertedTelegramIds, ["987654321"]);
});

test("empty initData is rejected by request validation", async () => {
  const response = await request(app)
    .post("/api/v1/auth/telegram")
    .send({ initData: "" });
  assert.equal(response.status, 400);
});
