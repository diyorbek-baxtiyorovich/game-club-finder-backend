import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import { errorHandler } from "../src/middleware/error-handler.js";
import { createAuthRouter } from "../src/modules/auth/auth.routes.js";

let baseUrl: string;
let server: ReturnType<express.Express["listen"]>;
let logoutCount = 0;

before(async () => {
  const app = express();
  app.use(express.json());
  app.use(
    "/auth",
    createAuthRouter({
      async loginTelegram() {
        return {
          user: {
            id: "5",
            telegramId: "12345",
            role: "user",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          accessToken: "test-access-token",
          refreshToken: "test-refresh-token",
          tokenType: "Bearer",
          expiresIn: 900,
        };
      },
      async refresh() {
        return {
          user: {
            id: "5",
            telegramId: "12345",
            role: "user",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          accessToken: "test-access-token",
          refreshToken: "test-refresh-token",
          tokenType: "Bearer",
          expiresIn: 900,
        };
      },
      async logout() {
        logoutCount += 1;
      },
    }),
  );
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

test("login and refresh endpoints rate limit repeated requests", async () => {
  const refresh = await fetch(`${baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: "test-refresh-token" }),
  });
  assert.equal(refresh.status, 200);
  assert.equal((await refresh.json()).data.tokenType, "Bearer");
  const logout = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken: "test-refresh-token" }),
  });
  assert.equal(logout.status, 200);
  assert.equal(logoutCount, 1);

  const loginResponses = await Promise.all(
    Array.from({ length: 11 }, () =>
      fetch(`${baseUrl}/auth/telegram`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ initData: "signed-data" }),
      }),
    ),
  );
  const limitedLogins = loginResponses.filter(
    (response) => response.status === 429,
  );
  assert.ok(limitedLogins.length >= 1);
  assert.deepEqual(await limitedLogins[0].json(), {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message:
        "Kirish so‘rovlari soni chegaradan oshdi. Birozdan so‘ng qayta urinib ko‘ring.",
    },
  });

  const refreshResponses = await Promise.all(
    Array.from({ length: 21 }, () =>
      fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: "test-refresh-token" }),
      }),
    ),
  );
  assert.ok(refreshResponses.some((response) => response.status === 429));
});
