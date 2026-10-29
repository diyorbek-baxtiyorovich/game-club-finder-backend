import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";

import { databasePool } from "../src/config/database.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { createAuthenticate, requireRoles } from "../src/modules/auth/authenticate.js";
import { signAccessToken } from "../src/modules/auth/jwt.service.js";

const secret = "test-only-dev-auth-secret-long-enough-32";
let server: ReturnType<express.Express["listen"]>;
let baseUrl: string;

before(async () => {
  const app = express();
  app.get("/disabled/me", createAuthenticate(secret, true), (request, response) => {
    response.json(request.auth);
  });
  app.get("/disabled/admin", createAuthenticate(secret, true), requireRoles("admin"), (_request, response) => {
    response.json({ ok: true });
  });
  app.get("/enabled/me", createAuthenticate(secret, false), (request, response) => {
    response.json(request.auth);
  });
  app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  server.close();
  await databasePool.end();
});

test("AUTH_DISABLED lets token-less requests act as a real dev user per X-Dev-Role", async () => {
  const asAdmin = await fetch(`${baseUrl}/disabled/me`);
  assert.equal(asAdmin.status, 200);
  const admin = (await asAdmin.json()) as { id: string; role: string };
  assert.equal(admin.role, "admin");
  assert.equal((await fetch(`${baseUrl}/disabled/admin`)).status, 200);

  const asUser = (await fetch(`${baseUrl}/disabled/me`, { headers: { "x-dev-role": "user" } }).then((r) => r.json())) as {
    id: string;
    role: string;
  };
  assert.equal(asUser.role, "user");
  assert.notEqual(asUser.id, admin.id);
  assert.equal((await fetch(`${baseUrl}/disabled/admin`, { headers: { "x-dev-role": "user" } })).status, 403);

  const stored = await databasePool.query("SELECT 1 FROM users WHERE id = ANY($1::bigint[])", [[admin.id, asUser.id]]);
  assert.equal(stored.rowCount, 2, "dev users must be real rows so foreign keys work");

  assert.equal((await fetch(`${baseUrl}/disabled/me`, { headers: { "x-dev-role": "root" } })).status, 400);

  // A real token still wins over the bypass.
  const token = await signAccessToken({ id: "777", role: "club_owner" }, secret);
  const withToken = (await fetch(`${baseUrl}/disabled/me`, { headers: { authorization: `Bearer ${token}` } }).then((r) =>
    r.json(),
  )) as { id: string; role: string };
  assert.deepEqual(withToken, { id: "777", role: "club_owner" });

  // With the switch off nothing changes: no token → 401.
  assert.equal((await fetch(`${baseUrl}/enabled/me`)).status, 401);
});
