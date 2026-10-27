import assert from "node:assert/strict";
import { after, test } from "node:test";
import supertest from "supertest";

import { createApp } from "../src/app.js";
import { databasePool } from "../src/config/database.js";
import { env } from "../src/config/env.js";
import { signAccessToken } from "../src/modules/auth/jwt.service.js";

const app = createApp();
let testUserId: string | undefined;

after(async () => {
  if (testUserId)
    await databasePool.query("DELETE FROM users WHERE id = $1", [testUserId]);
  await databasePool.end();
});

test("game catalog service exposes seeded games through the Express API", async () => {
  const allGames = await supertest(app).get("/api/v1/games");
  assert.equal(allGames.status, 200);
  assert.equal(allGames.body.success, true);
  assert.ok(Array.isArray(allGames.body.data) && allGames.body.data.length > 0);

  const popular = await supertest(app).get("/api/v1/games/popular");
  assert.equal(popular.status, 200);
  assert.ok(
    popular.body.data.every((game: { isPopular: boolean }) => game.isPopular),
  );
});

test("users service returns only the authenticated user's profile", async () => {
  assert.ok(
    env.jwtAccessSecret,
    "JWT_ACCESS_SECRET must be configured for this integration test",
  );
  const telegramId = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
  const created = await databasePool.query<{ id: string }>(
    "INSERT INTO users (telegram_id, role) VALUES ($1, 'user') RETURNING id::text",
    [telegramId],
  );
  testUserId = created.rows[0].id;
  const token = await signAccessToken(
    { id: testUserId, role: "user" },
    env.jwtAccessSecret,
  );

  const response = await supertest(app)
    .get("/api/v1/users/me")
    .set("authorization", `Bearer ${token}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.id, testUserId);
  assert.equal(response.body.data.telegramId, telegramId);
  assert.equal(response.body.data.role, "user");
});
