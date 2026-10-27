import assert from "node:assert/strict";
import express from "express";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import { AppError } from "../src/common/errors/app-error.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import {
  createAuthenticate,
  requireRoles,
} from "../src/modules/auth/authenticate.js";
import { assertCanManageClub } from "../src/modules/auth/authorize.js";
import { signAccessToken } from "../src/modules/auth/jwt.service.js";
import { usersRouter } from "../src/modules/users/users.routes.js";

const secret = "test-only-authz-secret-that-is-long-enough";
const nowSeconds = Math.floor(Date.now() / 1000);
let baseUrl: string;
let server: ReturnType<express.Express["listen"]>;
let userToken: string;
let ownerToken: string;

before(async () => {
  userToken = await signAccessToken(
    { id: "101", role: "user" },
    secret,
    nowSeconds,
  );
  ownerToken = await signAccessToken(
    { id: "202", role: "club_owner" },
    secret,
    nowSeconds,
  );
  const app = express();
  app.get(
    "/owner",
    createAuthenticate(secret),
    requireRoles("club_owner", "admin"),
    (_request, response) => {
      response.json({ success: true });
    },
  );
  app.use("/api/v1/users", usersRouter);
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

test("protected routes return 401 without JWT and 403 for an ordinary user", async () => {
  const missing = await fetch(`${baseUrl}/owner`);
  const forbidden = await fetch(`${baseUrl}/owner`, {
    headers: { authorization: `Bearer ${userToken}` },
  });
  const allowed = await fetch(`${baseUrl}/owner`, {
    headers: { authorization: `Bearer ${ownerToken}` },
  });

  assert.equal(missing.status, 401);
  assert.equal(forbidden.status, 403);
  assert.equal(allowed.status, 200);
  const currentUser = await fetch(`${baseUrl}/api/v1/users/me`);
  assert.equal(currentUser.status, 401);
});

test("club ownership is enforced in service policy and admins can override it", () => {
  assert.throws(
    () => assertCanManageClub({ id: "101", role: "user" }, "101"),
    AppError,
  );
  assert.throws(
    () => assertCanManageClub({ id: "202", role: "club_owner" }, "303"),
    (error: unknown) => error instanceof AppError && error.statusCode === 403,
  );
  assert.doesNotThrow(() =>
    assertCanManageClub({ id: "202", role: "club_owner" }, "202"),
  );
  assert.doesNotThrow(() =>
    assertCanManageClub({ id: "1", role: "admin" }, "303"),
  );
});
