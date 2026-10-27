import assert from "node:assert/strict";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import { createApp } from "../src/app.js";
import { databasePool } from "../src/config/database.js";
import { env } from "../src/config/env.js";
import { signAccessToken } from "../src/modules/auth/jwt.service.js";

let server: Server;
let baseUrl: string;
const userIds: string[] = [];
const clubIds: string[] = [];
const tokens: string[] = [];

async function request(path: string, method = "GET", token?: string) {
  return fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

async function createClub(
  ownerId: string,
  status: "approved" | "pending",
  active = true,
) {
  const slug = `favorite-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await databasePool.query<{ id: string }>(
    `INSERT INTO game_clubs (owner_id, name, slug, address, city, location, status, is_active)
     VALUES ($1, $2, $3, 'Test address', 'Tashkent',
       ST_SetSRID(ST_MakePoint(69.24, 41.30), 4326)::geography, $4, $5)
     RETURNING id::text`,
    [ownerId, slug, slug, status, active],
  );
  clubIds.push(result.rows[0].id);
  return result.rows[0].id;
}

before(async () => {
  assert.ok(env.jwtAccessSecret);
  for (let index = 0; index < 2; index++) {
    const telegramId = `${Date.now()}${Math.floor(Math.random() * 1_000_000)}`;
    const user = await databasePool.query<{ id: string }>(
      "INSERT INTO users (telegram_id, role) VALUES ($1, 'user') RETURNING id::text",
      [telegramId],
    );
    userIds.push(user.rows[0].id);
    tokens.push(
      await signAccessToken(
        { id: user.rows[0].id, role: "user" },
        env.jwtAccessSecret!,
      ),
    );
  }
  server = createApp().listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
  if (clubIds.length)
    await databasePool.query(
      "DELETE FROM game_clubs WHERE id = ANY($1::bigint[])",
      [clubIds],
    );
  if (userIds.length)
    await databasePool.query("DELETE FROM users WHERE id = ANY($1::bigint[])", [
      userIds,
    ]);
  await databasePool.end();
});

test("favorites are unique, user-scoped, removable, and hide non-public clubs", async () => {
  const clubId = await createClub(userIds[0], "approved");
  const pendingId = await createClub(userIds[0], "pending");
  const inactiveId = await createClub(userIds[0], "approved", false);
  assert.equal((await request("/favorites")).status, 401);
  assert.equal(
    (await request(`/favorites/${pendingId}`, "POST", tokens[0])).status,
    404,
  );
  assert.equal(
    (await request(`/favorites/${inactiveId}`, "POST", tokens[0])).status,
    404,
  );
  assert.equal(
    (await request(`/favorites/${clubId}`, "POST", tokens[0])).status,
    201,
  );
  assert.equal(
    (await request(`/favorites/${clubId}`, "POST", tokens[0])).status,
    200,
  );
  const count = await databasePool.query<{ total: string }>(
    "SELECT count(*)::text AS total FROM favorites WHERE user_id = $1 AND club_id = $2",
    [userIds[0], clubId],
  );
  assert.equal(count.rows[0].total, "1");
  assert.equal(
    (await request(`/favorites/${clubId}`, "POST", tokens[1])).status,
    201,
  );
  const first = await request("/favorites", "GET", tokens[0]);
  const second = await request("/favorites", "GET", tokens[1]);
  assert.equal(
    ((await first.json()) as { meta: { total: number } }).meta.total,
    1,
  );
  assert.equal(
    ((await second.json()) as { meta: { total: number } }).meta.total,
    1,
  );
  const removeFirst = await request(
    `/favorites/${clubId}`,
    "DELETE",
    tokens[0],
  );
  assert.equal(
    ((await removeFirst.json()) as { data: { removed: boolean } }).data.removed,
    true,
  );
  assert.equal(
    (
      (await request("/favorites", "GET", tokens[0]).then((r) => r.json())) as {
        meta: { total: number };
      }
    ).meta.total,
    0,
  );
  assert.equal(
    (
      (await request("/favorites", "GET", tokens[1]).then((r) => r.json())) as {
        meta: { total: number };
      }
    ).meta.total,
    1,
  );
  await databasePool.query(
    "UPDATE game_clubs SET is_active = false WHERE id = $1",
    [clubId],
  );
  assert.equal(
    (
      (await request("/favorites", "GET", tokens[1]).then((r) => r.json())) as {
        meta: { total: number };
      }
    ).meta.total,
    0,
  );
  assert.equal(
    (await request(`/favorites/${clubId}`, "POST", tokens[1])).status,
    404,
  );
  const removeHidden = await request(
    `/favorites/${clubId}`,
    "DELETE",
    tokens[1],
  );
  assert.equal(
    ((await removeHidden.json()) as { data: { removed: boolean } }).data
      .removed,
    true,
  );
});

test("authenticated public detail records deduplicated history per user", async () => {
  const clubId = await createClub(userIds[0], "approved");
  const pendingId = await createClub(userIds[0], "pending");
  assert.equal((await request(`/clubs/${clubId}`)).status, 200);
  assert.equal((await request("/history")).status, 401);
  assert.equal(
    (
      (await request("/history", "GET", tokens[0]).then((r) => r.json())) as {
        meta: { total: number };
      }
    ).meta.total,
    0,
  );
  assert.equal(
    (await request(`/clubs/${clubId}`, "GET", "invalid")).status,
    401,
  );
  assert.equal(
    (await request(`/clubs/${pendingId}`, "GET", tokens[0])).status,
    404,
  );
  assert.equal(
    (await request(`/clubs/${clubId}`, "GET", tokens[0])).status,
    200,
  );
  assert.equal(
    (await request(`/clubs/${clubId}`, "GET", tokens[0])).status,
    200,
  );
  assert.equal(
    (await request(`/clubs/${clubId}`, "GET", tokens[1])).status,
    200,
  );
  const first = await request("/history", "GET", tokens[0]);
  const second = await request("/history", "GET", tokens[1]);
  const firstBody = (await first.json()) as {
    data: Array<{ club: { id: string }; viewCount: number }>;
    meta: { total: number };
  };
  const secondBody = (await second.json()) as {
    data: Array<{ viewCount: number }>;
    meta: { total: number };
  };
  assert.equal(firstBody.meta.total, 1);
  assert.equal(firstBody.data[0].club.id, clubId);
  assert.equal(firstBody.data[0].viewCount, 2);
  assert.equal(secondBody.meta.total, 1);
  assert.equal(secondBody.data[0].viewCount, 1);
  await databasePool.query(
    "UPDATE view_history SET last_viewed_at = current_timestamp - interval '91 days' WHERE user_id = $1",
    [userIds[0]],
  );
  const expired = await request("/history", "GET", tokens[0]);
  assert.equal(
    ((await expired.json()) as { meta: { total: number } }).meta.total,
    0,
  );
  await databasePool.query(
    "UPDATE game_clubs SET is_active = false WHERE id = $1",
    [clubId],
  );
  const hidden = await request("/history", "GET", tokens[1]);
  assert.equal(
    ((await hidden.json()) as { meta: { total: number } }).meta.total,
    0,
  );
});

test("history keeps at most 100 recent clubs for one user", async () => {
  const prefix = `history-cap-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const clubs = await databasePool.query<{ id: string }>(
    `INSERT INTO game_clubs (owner_id, name, slug, address, city, location, status)
     SELECT $1, 'History cap test', $2 || '-' || n::text, 'Test address', 'Tashkent',
       ST_SetSRID(ST_MakePoint(69.24, 41.30), 4326)::geography, 'approved'
     FROM generate_series(1, 101) AS n RETURNING id::text`,
    [userIds[0], prefix],
  );
  clubIds.push(...clubs.rows.map((row) => row.id));
  await databasePool.query(
    `INSERT INTO view_history (user_id, club_id, last_viewed_at)
     SELECT $1, id, current_timestamp - (id % 101) * interval '1 second'
     FROM game_clubs WHERE id = ANY($2::bigint[])`,
    [userIds[0], clubs.rows.map((row) => row.id)],
  );
  const response = await request("/history?limit=100", "GET", tokens[0]);
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    data: unknown[];
    meta: { total: number };
  };
  assert.equal(body.meta.total, 100);
  assert.equal(body.data.length, 100);
  const count = await databasePool.query<{ total: string }>(
    "SELECT count(*)::text AS total FROM view_history WHERE user_id = $1",
    [userIds[0]],
  );
  assert.equal(count.rows[0].total, "100");
});
